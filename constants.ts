
import React from 'react';
import { QuestionType, Role } from './types';
// Fix: Aliased `Type` and `User` to avoid name collisions in other files that import this config.
import { MessageSquare, CheckSquare, Type as TypeIcon, Tally5, Star, AlignLeft, Calendar, Upload, Grip, List, Shield, User as UserIcon, MessageCircle } from 'lucide-react';

export const QUESTION_TYPE_CONFIG = {
  [QuestionType.SingleChoice]: { name: 'Single Choice', icon: CheckSquare },
  [QuestionType.MultipleChoice]: { name: 'Multiple Choice', icon: Tally5 },
  // Fix: Use aliased `TypeIcon` to prevent name collisions.
  [QuestionType.TextInput]: { name: 'Text Input', icon: TypeIcon },
  [QuestionType.Paragraph]: { name: 'Paragraph', icon: AlignLeft },
  [QuestionType.Dropdown]: { name: 'Dropdown', icon: List },
  [QuestionType.Rating]: { name: 'Rating', icon: Star },
  [QuestionType.Likert]: { name: 'Likert Scale', icon: MessageSquare },
  [QuestionType.Date]: { name: 'Date Picker', icon: Calendar },
  [QuestionType.FileUpload]: { name: 'File Upload', icon: Upload },
  [QuestionType.Matrix]: { name: 'Matrix/Grid', icon: Grip },
};

// Fix: Added React import for React.ElementType and aliased User icon to avoid name collisions.
export const ROLE_CONFIG: Record<Role, { name: string; icon: React.ElementType }> = {
  admin: { name: 'Admin', icon: Shield },
  // Fix: Use aliased `UserIcon` to prevent name collisions with the `User` type.
  creator: { name: 'Creator', icon: UserIcon },
  respondent: { name: 'Respondent', icon: MessageCircle },
};
