import { Survey, SurveyResponse, User, Role, Question, QuestionType } from '../types';

// --- MOCK DATABASE using localStorage ---
const MOCK_DELAY = 300; // ms

interface Database {
  users: User[];
  surveys: Survey[];
  responses: SurveyResponse[];
}

const initializeDb = (): Database => {
  const dbString = localStorage.getItem('surveySparrowDb');
  if (dbString) {
    try {
      return JSON.parse(dbString);
    } catch (e) {
      console.error("Failed to parse DB from localStorage, resetting.", e);
      localStorage.removeItem('surveySparrowDb');
    }
  }

  // A single default user is created for the app to function.
  const defaultUser: User = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
    profilePictureUrl: `https://i.pravatar.cc/150?u=jane`,
  };

  // Surveys and responses start as empty arrays.
  const initialSurveys: Survey[] = [];
  const initialResponses: SurveyResponse[] = [];

  const newDb: Database = {
    users: [defaultUser],
    surveys: initialSurveys,
    responses: initialResponses,
  };

  localStorage.setItem('surveySparrowDb', JSON.stringify(newDb));
  return newDb;
};

let db = initializeDb();

const saveDb = () => {
  localStorage.setItem('surveySparrowDb', JSON.stringify(db));
};

const simulateApi = <T>(data: T): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation issues
    }, MOCK_DELAY);
  });
};

// --- AUTH API ---
export const getCurrentUser = async (): Promise<User> => {
  const user = db.users[0]; // Get the first user as the "logged in" user
  if (!user) {
      // This case should ideally not happen with initializeDb, but it's good practice
      const fallbackUser: User = { id: 'fallback-user', name: 'Guest', email: 'guest@example.com', role: 'respondent', createdAt: new Date().toISOString() };
      return simulateApi(fallbackUser);
  }
  return simulateApi(user);
};

// --- SURVEY API ---
export const getSurveys = async (): Promise<Survey[]> => {
  return simulateApi(db.surveys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
};

export const getSurvey = async (id: string): Promise<Survey | undefined> => {
  return simulateApi(db.surveys.find(s => s.id === id));
};

export const createSurvey = async (surveyData: Omit<Survey, 'id' | 'responsesCount' | 'createdAt'>): Promise<Survey> => {
    const newSurvey: Survey = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        responsesCount: 0,
        welcomeMessage: '',
        thankYouMessage: '',
        isAnonymous: false,
        ...surveyData,
    };
    db.surveys.unshift(newSurvey);
    saveDb();
    return simulateApi(newSurvey);
};

export const updateSurvey = async (id: string, surveyData: Partial<Omit<Survey, 'id'>>): Promise<Survey> => {
    let surveyToUpdate = db.surveys.find(s => s.id === id);
    if (!surveyToUpdate) throw new Error("Survey not found");
    
    const updatedSurvey = { ...surveyToUpdate, ...surveyData };
    db.surveys = db.surveys.map(s => s.id === id ? updatedSurvey : s);
    saveDb();
    return simulateApi(updatedSurvey);
};

export const deleteSurvey = async (id: string): Promise<void> => {
    db.surveys = db.surveys.filter(s => s.id !== id);
    db.responses = db.responses.filter(r => r.surveyId !== id);
    saveDb();
    return simulateApi(undefined);
};

// --- USER API ---
export const getUsers = async (): Promise<User[]> => {
    return simulateApi(db.users);
};

export const updateUser = async (id: string, userData: Partial<Omit<User, 'id'>>): Promise<User> => {
    let userToUpdate = db.users.find(u => u.id === id);
    if (!userToUpdate) throw new Error("User not found");

    const updatedUser = { ...userToUpdate, ...userData };
    db.users = db.users.map(u => u.id === id ? updatedUser : u);
    saveDb();
    return simulateApi(updatedUser);
};

export const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newUser: User = {
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString(),
        profilePictureUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        ...userData,
    };
    db.users.push(newUser);
    saveDb();
    return simulateApi(newUser);
};

export const deleteUser = async (id: string): Promise<void> => {
    if (db.users.length <= 1 || db.users[0].id === id) {
        throw new Error("Cannot delete the primary admin user.");
    }
    db.users = db.users.filter(u => u.id !== id);
    saveDb();
    return simulateApi(undefined);
};

// --- RESPONSE API ---
export const getResponses = async (surveyId?: string): Promise<SurveyResponse[]> => {
  if (surveyId) {
    return simulateApi(db.responses.filter(r => r.surveyId === surveyId));
  }
  return simulateApi(db.responses);
};
