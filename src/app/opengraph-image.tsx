import { ImageResponse } from 'next/og';

export const alt =
  'RethLab — Catch up with the Rust-native EVM wave (Reth, Revm, Alloy, Foundry) line by line';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          background:
            'linear-gradient(135deg, #050505 0%, #161618 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          position: 'relative',
          color: '#fafafa',
          fontFamily: 'monospace',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            🦀
          </div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>RethLab</div>
        </div>

        {/* Tagline pill */}
        <div
          style={{
            marginTop: 22,
            alignSelf: 'flex-start',
            padding: '8px 18px',
            borderRadius: 999,
            background: '#1a1a1d',
            border: '1px solid #27272a',
            fontSize: 16,
            color: '#a8a29e',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: '#f97316',
            }}
          />
          Demanding · Source-grounded · No fluff
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 36,
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span>Become a Hardcore</span>
          <span style={{ color: '#f97316' }}>Rust Ethereum Developer</span>
        </div>

        {/* Code card */}
        <div
          style={{
            marginTop: 36,
            background: '#111114',
            border: '1px solid #27272a',
            borderRadius: 16,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#71717a',
              marginBottom: 14,
              fontSize: 15,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#ef4444',
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#eab308',
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#22c55e',
              }}
            />
            <span style={{ marginLeft: 12 }}>
              bluealloy/revm · interpreter/instructions/arithmetic.rs
            </span>
          </div>
          <div style={{ color: '#71717a' }}>
            // The real ADD opcode that runs on every Ethereum block
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ color: '#f97316' }}>pub fn</span>
            <span>&nbsp;add&lt;IT, H&gt;(ctx) -&gt; Result {'{'}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span>&nbsp;&nbsp;</span>
            <span style={{ color: '#eab308' }}>popn_top!</span>
            <span>([op1], op2, ctx.interpreter);</span>
          </div>
          <div>&nbsp;&nbsp;*op2 = op1.wrapping_add(*op2);</div>
          <div style={{ display: 'flex' }}>
            <span>&nbsp;&nbsp;</span>
            <span style={{ color: '#f97316' }}>Ok</span>
            <span>(())</span>
          </div>
          <div>{'}'}</div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 60,
            right: 60,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 16,
          }}
        >
          <span style={{ color: '#a8a29e' }}>
            Reth · Revm · Alloy · Foundry — line by line
          </span>
          <span style={{ color: '#f97316' }}>@psyto</span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 18,
            background:
              'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
