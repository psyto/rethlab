// ==========================================
// Service Interfaces
// ==========================================

export interface Progress {
  courseId: string;
  userId: string;
  completedLessons: number[];
  totalLessons: number;
  percentage: number;
  enrollmentStatus: 'active' | 'completed' | 'dropped';
}

export interface LearningProgressService {
  getProgress(userId: string, courseId: string): Promise<Progress>;
  completeLesson(userId: string, courseId: string, lessonIndex: number): Promise<void>;
}

// ==========================================
// UI Types
// ==========================================

export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  duration: number;
  xpReward: number;
  track: string | null;
  tags: string[];
  instructorName: string | null;
  instructorImage: string | null;
  totalLessons: number;
  // Slugs of every lesson in the course, in order. Used by the catalog to
  // compute per-course progress for anonymous users from localStorage.
  lessonSlugs: string[];
  enrolledCount: number;
  userProgress?: number; // 0-100 if enrolled
}

export interface ModuleWithLessons {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string;
  slug: string;
  type: 'CONTENT' | 'CHALLENGE' | 'VIDEO' | 'QUIZ';
  duration: number;
  xpReward: number;
  isCompleted?: boolean;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface ChallengeResult {
  passed: boolean;
  testResults: {
    description: string;
    passed: boolean;
    actual?: string;
    expected?: string;
  }[];
  output: string;
  error?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

