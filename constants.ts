
import { QuestionType, Role } from './types';
import { MessageSquare, CheckSquare, Type, Tally5, Star, AlignLeft, Calendar, Upload, Grip, List, Shield, User, MessageCircle } from 'lucide-react';

export const QUESTION_TYPE_CONFIG = {
  [QuestionType.SingleChoice]: { name: 'Single Choice', icon: CheckSquare },
  [QuestionType.MultipleChoice]: { name: 'Multiple Choice', icon: Tally5 },
  [QuestionType.TextInput]: { name: 'Text Input', icon: Type },
  [QuestionType.Paragraph]: { name: 'Paragraph', icon: AlignLeft },
  [QuestionType.Dropdown]: { name: 'Dropdown', icon: List },
  [QuestionType.Rating]: { name: 'Rating', icon: Star },
  [QuestionType.Likert]: { name: 'Likert Scale', icon: MessageSquare },
  [QuestionType.Date]: { name: 'Date Picker', icon: Calendar },
  [QuestionType.FileUpload]: { name: 'File Upload', icon: Upload },
  [QuestionType.Matrix]: { name: 'Matrix/Grid', icon: Grip },
};

export const ROLE_CONFIG: Record<Role, { name: string; icon: React.ElementType }> = {
  admin: { name: 'Admin', icon: Shield },
  creator: { name: 'Creator', icon: User },
  respondent: { name: 'Respondent', icon: MessageCircle },
};
