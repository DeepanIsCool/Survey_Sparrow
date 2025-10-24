
export enum QuestionType {
  SingleChoice = 'single-choice',
  MultipleChoice = 'multiple-choice',
  TextInput = 'text-input',
  Paragraph = 'paragraph',
  Dropdown = 'dropdown',
  Rating = 'rating',
  Likert = 'likert',
  Date = 'date',
  FileUpload = 'file-upload',
  Matrix = 'matrix',
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface MatrixRow {
  id: string;
  label: string;
}

export interface MatrixColumn {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  isRequired: boolean;
  options?: QuestionOption[];
  scale?: number; // For Rating type
  statements?: string[]; // For Likert type
  choices?: string[]; // For Likert type
  rows?: MatrixRow[]; // For Matrix type
  columns?: MatrixColumn[]; // For Matrix type
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  questions: Question[];
  responsesCount: number;
  welcomeMessage?: string;
  thankYouMessage?: string;
  isAnonymous?: boolean;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  submittedAt: string;
  answers: Record<string, any>;
}

export type Role = 'admin' | 'creator' | 'respondent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profilePictureUrl?: string;
  createdAt: string;
}