import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      locale?: string;
    };
  }

  interface User {
    id: string;
    locale?: string;
  }
}

const providers = [];

if (process.env.GITHUB_ID) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.ENABLE_DEV_AUTH === 'true') {
  providers.push(
    Credentials({
      name: 'Dev Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0],
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
        };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // PrismaAdapter handles user/account creation on OAuth sign-in
  // but we use JWT for session management (database sessions have
  // issues in NextAuth v5 beta).
  // For URL generation under Next.js basePath, set AUTH_URL to
  // include /rethlab (e.g. https://fabrknt.com/rethlab).
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in, user object is available
      if (user) {
        token.id = user.id;
        token.locale = user.locale;
      }
      // For OAuth, look up the DB user to get the correct id
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, locale: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.locale = dbUser.locale;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.locale = token.locale as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
});
