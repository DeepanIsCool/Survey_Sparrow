
import React, { useState, useCallback, useMemo, useRef, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home, Plus, FileText, BarChart2, Users, Settings, LogOut, ChevronDown, Trash2, Edit, Move, Eye, Share2, MoreHorizontal, AlertTriangle, Wand2, Loader2, Sparkles, GripVertical, Check, MessageSquare, CheckSquare, Type as TypeIcon, Tally5, Star, AlignLeft, Calendar, Upload, Grip, List as ListIcon, Shield, User as UserIcon, Sun, Moon } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Survey, Question, QuestionType, SurveyResponse, User, Role } from './types';
import { QUESTION_TYPE_CONFIG, ROLE_CONFIG } from './constants';
import { generateSurveyFromPrompt } from './services/geminiService';
import * as api from './services/api';

// --- THEME PROVIDER ---

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('survey-theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('survey-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- REUSABLE UI COMPONENTS ---

const Icon = ({ name, className = '' }: { name: React.ElementType; className?: string }) => {
    const LucideIcon = name;
    return <LucideIcon className={`h-5 w-5 ${className}`} />;
};

const Button = React.forwardRef<HTMLButtonElement, { children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }>(
  ({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none';
    const sizeClasses = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
    const variantClasses = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-sm',
        secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-primary-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-primary-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        link: 'bg-transparent text-primary-600 hover:underline dark:text-primary-400'
    };
    return <button ref={ref} type={type} onClick={onClick} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} disabled={disabled}>{children}</button>;
});

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input ref={ref} {...props} className={`block w-full rounded-md border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary-400 focus:ring focus:ring-primary-200 focus:ring-opacity-50 sm:text-sm transition-shadow placeholder:text-slate-400 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-primary-500/50 dark:focus:border-primary-500 ${props.className || ''}`} />
));

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
    <textarea ref={ref} {...props} className={`block w-full rounded-md border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary-400 focus:ring focus:ring-primary-200 focus:ring-opacity-50 sm:text-sm transition-shadow placeholder:text-slate-400 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-primary-500/50 dark:focus:border-primary-500 ${props.className || ''}`} />
));

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 ${className}`}>
        {children}
    </div>
);

const DropdownMenu: React.FC<{ trigger: React.ReactNode, children: React.ReactNode }> = ({ trigger, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 py-1 dark:bg-slate-700 dark:ring-white dark:ring-opacity-10">
                    {children}
                </div>
            )}
        </div>
    );
};
const DropdownMenuItem: React.FC<{ icon: React.ElementType, children: React.ReactNode, onClick: () => void, className?: string }> = ({ icon, children, onClick, className }) => (
    <button onClick={onClick} className={`w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600 ${className}`}>
        <Icon name={icon} className="mr-3 h-4 w-4" />
        {children}
    </button>
);


const AIGenerateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (surveyData: { title: string; description: string; questions: Omit<Question, 'id'>[] }) => void;
}> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a topic for your survey.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const surveyData = await generateSurveyFromPrompt(prompt);
      onGenerate(surveyData);
      onClose();
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
      if(!isOpen) {
        setPrompt('');
        setError(null);
        setIsLoading(false);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-60 transition-opacity dark:bg-opacity-80">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 transform transition-all dark:bg-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 dark:text-slate-100">
            <Icon name={Sparkles} className="text-primary-500 h-6 w-6" />
            Generate Survey with AI
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:hover:text-slate-300">&times;</button>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">Describe the survey you want to create. For example: "A weekly employee satisfaction pulse survey about work-life balance and management support."</p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter survey topic..."
          rows={4}
          disabled={isLoading}
        />
        {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isLoading || !prompt}>
            {isLoading ? (
              <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating... </>
            ) : 'Generate Survey'}
          </Button>
        </div>
      </div>
    </div>
  );
};


// --- LAYOUT COMPONENTS ---

const Logo = () => (
    <Link to="/" className="flex items-center justify-center h-16 border-b border-slate-200/80 shrink-0 px-4 dark:border-slate-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-primary-600">
            <path d="M22,7.4c-0.4-1.2-1.2-2.2-2.3-2.8c-1.1-0.6-2.4-0.8-3.7-0.6c-2.3,0.4-4.2,2.2-4.7,4.5c-0.1,0.5-0.2,1-0.2,1.6 c0,0.4,0,0.8,0.1,1.2c-1.3-0.9-2.8-1.5-4.4-1.7C5.1,9.3,3.5,10,2.6,11.3c-0.9,1.3-1,3-0.3,4.5c0.8,1.5,2.3,2.5,4,2.7 c0.8,0.1,1.6,0,2.3-0.2c0.2,0.8,0.5,1.6,0.9,2.3c0.4,0.7,0.8,1.3,1.3,1.9c0.5,0.6,1.2,1,1.9,1.2c0.7,0.2,1.5,0.1,2.2-0.2 c1.4-0.6,2.4-2,2.6-3.5c0.1-0.8,0-1.6-0.3-2.4c1.1,0.2,2.2,0.1,3.2-0.2c1.7-0.5,3-1.8,3.4-3.5C22.2,9.7,22.2,8.5,22,7.4z M17,11 c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S18.1,11,17,11z"/>
        </svg>
        <span className="text-xl font-bold text-slate-800 ml-2 tracking-tight dark:text-slate-100">SurveySparrow</span>
    </Link>
);

const Sidebar: React.FC<{navOpen: boolean, setNavOpen: (open: boolean) => void, currentUser: User | null}> = ({navOpen, setNavOpen, currentUser}) => {
    const location = useLocation();

    const NavLink = ({ to, icon, children }: { to: string; icon: React.ElementType; children: React.ReactNode }) => {
        const isActive = location.pathname === to || (to === '/analytics' && location.pathname.startsWith('/survey/'));
        return (
            <Link to={to} onClick={() => setNavOpen(false)} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'}`}>
                <Icon name={icon} className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`} />
                <span>{children}</span>
            </Link>
        );
    };

    return (
        <>
            <aside className={`fixed z-30 inset-y-0 left-0 bg-white w-64 border-r border-slate-200/80 flex flex-col transform ${navOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 dark:bg-slate-900 dark:border-slate-800`}>
                <Logo />
                <nav className="p-4 space-y-1 flex-1">
                    <NavLink to="/" icon={Home}>Dashboard</NavLink>
                    <NavLink to="/responses" icon={MessageSquare}>Responses</NavLink>
                    <NavLink to="/analytics" icon={BarChart2}>Analytics</NavLink>
                    <NavLink to="/users" icon={Users}>Users</NavLink>
                    <NavLink to="/settings" icon={Settings}>Settings</NavLink>
                </nav>
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
                   {currentUser ? (
                     <div className="flex items-center group p-2">
                        <img className="h-10 w-10 rounded-full" src={currentUser.profilePictureUrl} alt="User" />
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 capitalize dark:text-slate-400">{currentUser.role}</p>
                        </div>
                    </div>
                   ) : (
                    <div className="h-14"></div> // Placeholder for loading
                   )}
                </div>
            </aside>
            {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 bg-black/20 z-20 md:hidden" />}
        </>
    );
};

const Header: React.FC<{onNavToggle: () => void}> = ({onNavToggle}) => {
    return (
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 md:px-6 dark:bg-slate-900/80 dark:border-slate-800">
            <button onClick={onNavToggle} className="text-slate-500 md:hidden -ml-2 dark:text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
                 <Button variant="ghost" size="sm" className="!rounded-full !p-2 h-9 w-9">
                    <Icon name={LogOut}/>
                </Button>
            </div>
        </header>
    );
};

// --- PAGE COMPONENTS ---

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAIGenerateOpen, setIsAIGenerateOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        api.getSurveys().then(data => {
            setSurveys(data);
            setIsLoading(false);
        });
    }, []);

    const handleCreateSurvey = async () => {
        const newSurvey = await api.createSurvey({
            title: 'Untitled Survey', description: '', status: 'draft', questions: [],
        });
        navigate(`/survey/${newSurvey.id}/edit`);
    };

    const handleAIGenerate = async (data: { title: string, description: string, questions: Omit<Question, 'id'>[] }) => {
        const newSurvey = await api.createSurvey({
            ...data,
            status: 'draft',
            questions: data.questions.map(q => ({...q, id: String(Math.random())})),
        });
        navigate(`/survey/${newSurvey.id}/edit`);
    }
    
    const handleDeleteSurvey = async (id: string) => {
        if(window.confirm('Are you sure you want to delete this survey? This action cannot be undone.')){
            await api.deleteSurvey(id);
            setSurveys(prev => prev.filter(s => s.id !== id));
        }
    };

    const totalResponses = useMemo(() => surveys.reduce((acc, s) => acc + s.responsesCount, 0), [surveys]);

    const statusColors: Record<Survey['status'], string> = { published: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', closed: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' };

    const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ElementType }) => (
      <Card className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1 dark:text-slate-100">{value}</p>
        </div>
        <div className="bg-primary-50 p-2.5 rounded-lg dark:bg-primary-500/10">
          <Icon name={icon} className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
      </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
                    <p className="text-slate-500 mt-1 dark:text-slate-400">Welcome back, Jane! Here's an overview of your surveys.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAIGenerateOpen(true)}> <Icon name={Wand2} className="mr-2 h-4 w-4" /> Create with AI </Button>
                    <Button variant="secondary" onClick={handleCreateSurvey}> <Icon name={Plus} className="mr-2 h-4 w-4" /> New Survey </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Total Surveys" value={surveys.length} icon={FileText} />
              <StatCard title="Total Responses" value={totalResponses} icon={MessageSquare} />
              <StatCard title="Active Surveys" value={surveys.filter(s => s.status === 'published').length} icon={CheckSquare} />
            </div>
            
            <Card>
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Surveys</h2>
                </div>
                {isLoading ? (
                    <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                                <tr>
                                    <th className="text-left font-semibold p-4">Title</th>
                                    <th className="text-left font-semibold p-4">Status</th>
                                    <th className="text-left font-semibold p-4">Responses</th>
                                    <th className="text-left font-semibold p-4">Created</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {surveys.map(survey => (
                                    <tr key={survey.id} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{survey.title}</td>
                                        <td className="p-4">
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[survey.status]}`}>
                                              {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                                          </span>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{survey.responsesCount}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(survey.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-right">
                                            <DropdownMenu trigger={<Button variant="ghost" size="sm" className="!px-2"><MoreHorizontal className="h-4 w-4" /></Button>}>
                                                <DropdownMenuItem icon={Edit} onClick={() => navigate(`/survey/${survey.id}/edit`)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem icon={BarChart2} onClick={() => navigate(`/survey/${survey.id}/analytics`)}>Analytics</DropdownMenuItem>
                                                <DropdownMenuItem icon={Trash2} onClick={() => handleDeleteSurvey(survey.id)} className="text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10">Delete</DropdownMenuItem>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <AIGenerateModal isOpen={isAIGenerateOpen} onClose={() => setIsAIGenerateOpen(false)} onGenerate={handleAIGenerate} />
        </div>
    );
};

const SurveyBuilder: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [activeTab, setActiveTab] = useState('editor');
    const [isPreviewing, setIsPreviewing] = useState(false);

    useEffect(() => {
        if (id) {
            api.getSurvey(id).then(data => {
                if (data) {
                    setSurvey(data);
                } else {
                    navigate('/'); // Survey not found
                }
            });
        }
    }, [id, navigate]);
    
    const updateSurvey = useCallback(async (updatedProps: Partial<Survey>) => {
        if (!survey) return;
        setSurvey(prev => prev ? { ...prev, ...updatedProps } : null); // Optimistic update
        await api.updateSurvey(survey.id, updatedProps);
    }, [survey]);

    const addQuestion = (type: QuestionType) => {
        if (!survey) return;
        const newQuestion: Question = {
            id: String(Date.now()), type, title: `New ${QUESTION_TYPE_CONFIG[type].name} Question`, isRequired: false,
            ...(type === QuestionType.SingleChoice || type === QuestionType.MultipleChoice || type === QuestionType.Dropdown ? { options: [{ id: '1', label: 'Option 1' }] } : {}),
            ...(type === QuestionType.Rating ? { scale: 5 } : {}),
            ...(type === QuestionType.Likert ? { statements: ['Statement 1'], choices: ['Agree', 'Disagree'] } : {}),
            ...(type === QuestionType.Matrix ? { rows: [{ id: 'r1', label: 'Row 1' }], columns: [{ id: 'c1', label: 'Column 1' }] } : {}),
        };
        updateSurvey({ questions: [...survey.questions, newQuestion] });
    };

    const updateQuestion = (qId: string, updatedProps: Partial<Question>) => {
        if (!survey) return;
        const updatedQuestions = survey.questions.map(q => q.id === qId ? { ...q, ...updatedProps } : q);
        updateSurvey({ questions: updatedQuestions });
    };

    const deleteQuestion = (qId: string) => {
        if (!survey) return;
        updateSurvey({ questions: survey.questions.filter(q => q.id !== qId) });
    };
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const handleDragEnd = (event: { active: any, over: any }) => {
        const { active, over } = event;
        if (survey && over && active.id !== over.id) {
            const oldIndex = survey.questions.findIndex((q) => q.id === active.id);
            const newIndex = survey.questions.findIndex((q) => q.id === over.id);
            const newQuestions = arrayMove(survey.questions, oldIndex, newIndex);
            updateSurvey({ questions: newQuestions });
        }
    };

    if (!survey) {
        return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>;
    }

    if (isPreviewing) {
        return <SurveyPreviewPage survey={survey} onExitPreview={() => setIsPreviewing(false)} />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
            <header className="flex-shrink-0 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="px-6 h-20 flex justify-between items-center">
                    <input
                        className="text-3xl font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-0 border-none p-0 w-full placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
                        value={survey.title}
                        onChange={(e) => updateSurvey({ title: e.target.value })}
                        placeholder="Untitled Survey"
                    />
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Button variant="secondary" onClick={() => setIsPreviewing(true)}>
                            <Icon name={Eye} className="mr-2 h-4 w-4" /> Preview
                        </Button>
                        <Button onClick={() => updateSurvey({ status: 'published' })}>
                            <Icon name={Share2} className="mr-2 h-4 w-4" /> Publish
                        </Button>
                        <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:text-slate-800 rounded-md transition-colors dark:text-slate-400 dark:hover:text-slate-100">
                            <Icon name={LogOut} className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <nav className="px-6 flex gap-8">
                    {['Editor', 'Settings', 'Share', 'Results'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            className={`py-3 font-medium text-sm transition-colors border-b-2
                                ${activeTab === tab.toLowerCase()
                                    ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                                    : 'text-slate-500 hover:text-slate-800 border-transparent dark:text-slate-400 dark:hover:text-slate-100'}`
                            }
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </header>
            <main className="flex-1 flex overflow-hidden">
                {activeTab === 'editor' && (
                    <div className="flex-1 p-8 overflow-y-auto space-y-4">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={survey.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                {survey.questions.map((q, index) => (
                                    <QuestionEditor key={q.id} question={q} index={index} updateQuestion={updateQuestion} deleteQuestion={deleteQuestion} />
                                ))}
                            </SortableContext>
                        </DndContext>
                        {survey.questions.length === 0 && (
                            <div className="text-center border-2 border-dashed border-slate-300 rounded-lg py-12 dark:border-slate-600">
                                <FileText className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                                <h3 className="mt-2 text-slate-700 font-semibold dark:text-slate-300">Your survey is empty!</h3>
                                <p className="text-slate-500 mt-1 text-sm dark:text-slate-400">Add questions from the toolbox on the right.</p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'settings' && <SurveySettingsTab survey={survey} updateSurvey={updateSurvey} />}
                
                {activeTab === 'editor' && <QuestionToolbox addQuestion={addQuestion} />}
            </main>
        </div>
    );
};

const SurveySettingsTab: React.FC<{ survey: Survey, updateSurvey: (updatedProps: Partial<Survey>) => void }> = ({ survey, updateSurvey }) => {
    return (
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-800/50">
            <div className="max-w-3xl mx-auto space-y-6">
                <Card>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Survey Description</label>
                        <Textarea 
                            value={survey.description || ''} 
                            onChange={e => updateSurvey({ description: e.target.value })}
                            placeholder="Provide a brief description for your survey."
                            rows={3}
                        />
                    </div>
                </Card>
                 <Card>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Welcome Message</label>
                        <p className="text-sm text-slate-500 mb-2 dark:text-slate-400">This message will be shown to respondents before they start.</p>
                        <Textarea 
                            value={survey.welcomeMessage || ''} 
                            onChange={e => updateSurvey({ welcomeMessage: e.target.value })}
                            placeholder="e.g., Welcome! Thank you for taking the time to complete this survey."
                            rows={3}
                        />
                    </div>
                </Card>
                 <Card>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Thank You Message</label>
                        <p className="text-sm text-slate-500 mb-2 dark:text-slate-400">This message will be shown after a respondent completes the survey.</p>
                        <Textarea 
                            value={survey.thankYouMessage || ''} 
                            onChange={e => updateSurvey({ thankYouMessage: e.target.value })}
                             placeholder="e.g., Thank you for your feedback! We appreciate your input."
                            rows={3}
                        />
                    </div>
                </Card>
                <Card>
                     <div className="flex items-center justify-between p-6">
                        <div>
                            <h3 className="font-medium text-slate-800 dark:text-slate-200">Anonymous Responses</h3>
                            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">If enabled, respondent information will not be collected.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={survey.isAnonymous || false} onChange={e => updateSurvey({ isAnonymous: e.target.checked })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 dark:bg-slate-700 dark:peer-focus:ring-primary-800 dark:after:border-slate-600"></div>
                        </label>
                    </div>
                </Card>
            </div>
        </div>
    );
}

const QuestionToolbox: React.FC<{ addQuestion: (type: QuestionType) => void }> = ({ addQuestion }) => (
    <div className="w-72 bg-white border-l border-slate-200/80 p-4 overflow-y-auto dark:bg-slate-800 dark:border-slate-700/80">
        <h3 className="font-semibold text-slate-800 mb-4 px-1 text-base dark:text-slate-100">Question Types</h3>
        <div className="space-y-1">
            {Object.entries(QUESTION_TYPE_CONFIG).map(([type, { name, icon }]) => (
                <button key={type} onClick={() => addQuestion(type as QuestionType)} className="w-full flex items-center p-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left dark:hover:bg-slate-700">
                    <Icon name={icon} className="h-5 w-5 mr-3 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</span>
                </button>
            ))}
        </div>
    </div>
);

const QuestionEditor: React.FC<{ question: Question; index: number; updateQuestion: (qId: string, updatedProps: Partial<Question>) => void; deleteQuestion: (qId: string) => void; }> = ({ question, index, updateQuestion, deleteQuestion }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const onUpdate = (props: Partial<Question>) => updateQuestion(question.id, props);

    const OptionBasedBody = () => {
        const updateOption = (optId: string, label: string) => onUpdate({ options: question.options?.map(o => o.id === optId ? { ...o, label } : o) });
        const addOption = () => onUpdate({ options: [...(question.options || []), { id: String(Date.now()), label: `Option ${ (question.options?.length || 0) + 1}` }] });
        const removeOption = (optId: string) => onUpdate({ options: question.options?.filter(o => o.id !== optId) });

        return (
            <div className="mt-4 space-y-2">
                {question.options?.map(opt => (
                    <div key={opt.id} className="flex items-center gap-2 group">
                        <Input value={opt.label} onChange={e => updateOption(opt.id, e.target.value)} className="flex-grow text-sm !shadow-none !border-slate-200 hover:!border-slate-300 dark:!border-slate-600 dark:hover:!border-slate-500"/>
                        <button onClick={() => removeOption(opt.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
                <Button variant="link" size="sm" onClick={addOption} className="!font-medium">Add Option</Button>
            </div>
        );
    };

    return (
        <div ref={setNodeRef} style={style} className="p-6 bg-white border border-slate-200 rounded-lg relative group focus-within:border-primary-400 dark:bg-slate-800 dark:border-slate-700 dark:focus-within:border-primary-500">
             <div className="flex justify-between items-start mb-2">
                 <div className="flex items-start gap-3 w-full">
                     <div className="flex items-center gap-2 mt-1 shrink-0">
                         <button {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary-300 dark:hover:text-slate-300">
                             <GripVertical className="h-4 w-4" />
                         </button>
                         <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Q{index + 1}</span>
                     </div>
                     <Input value={question.title} onChange={e => onUpdate({ title: e.target.value })} className="text-md font-semibold !p-1 bg-transparent !border-transparent hover:!border-slate-200 focus:!bg-white focus:!ring-2 focus:!ring-primary-200 focus:!border-primary-300 !shadow-none w-full dark:hover:!border-slate-600 dark:focus:!bg-slate-900" />
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => deleteQuestion(question.id)} className="!p-1.5 opacity-0 group-hover:opacity-100">
                     <Trash2 className="h-4 w-4 text-slate-500" />
                 </Button>
             </div>
             
             <div className="pl-14">
                {(question.type === QuestionType.SingleChoice || question.type === QuestionType.MultipleChoice || question.type === QuestionType.Dropdown) && <OptionBasedBody />}
                {question.type === QuestionType.Rating && (
                    <div className="flex items-center gap-2 mt-3">
                        <label className="text-sm text-slate-600 dark:text-slate-300">Scale:</label>
                        <select value={question.scale} onChange={e => onUpdate({ scale: parseInt(e.target.value) })} className="rounded-md border-slate-300 text-sm focus:border-primary-400 focus:ring-primary-200 bg-white dark:bg-slate-700 dark:border-slate-500 dark:text-slate-200">
                            <option value={3}>1-3</option>
                            <option value={5}>1-5</option>
                            <option value={7}>1-7</option>
                            <option value={10}>1-10</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-3 flex justify-end">
                 <label className="flex items-center text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={question.isRequired} onChange={e => onUpdate({ isRequired: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-600 dark:checked:bg-primary-500" />
                    <span className="ml-2 font-medium">Required</span>
                </label>
            </div>
        </div>
    );
};

const AnalyticsDashboard: React.FC = () => {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(id || null);
    const { theme } = useTheme();
    
    const isDarkMode = useMemo(() => theme === 'dark', [theme]);
    
    useEffect(() => {
        api.getSurveys().then(data => {
            setSurveys(data);
            if (!id && data.length > 0) {
                setSelectedSurveyId(data[0].id);
            }
        });
    }, [id]);

    useEffect(() => {
        if (selectedSurveyId) {
            api.getResponses(selectedSurveyId).then(setResponses);
        }
    }, [selectedSurveyId]);

    const selectedSurvey = useMemo(() => surveys.find(s => s.id === selectedSurveyId), [surveys, selectedSurveyId]);
    
    const handleSurveyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setSelectedSurveyId(newId);
        navigate(`/survey/${newId}/analytics`, { replace: true });
    };

    const getChartData = (question: Question) => {
        if (!responses.length) return [];
        if (question.type === QuestionType.SingleChoice) {
            const counts: Record<string, number> = {};
            question.options?.forEach(opt => counts[opt.label] = 0);
            responses.forEach(r => { const answer = r.answers[question.id]; if (answer in counts) counts[answer]++; });
            return Object.entries(counts).map(([name, value]) => ({ name, value }));
        }
        return [];
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Analytics</h1>
                <div className="w-full max-w-xs">
                    <select value={selectedSurveyId || ''} onChange={handleSurveyChange} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                        <option value="" disabled>Select a survey...</option>
                        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>
            </div>
            
            {selectedSurvey && responses.length > 0 ? (
                <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-5"><h3 className="text-slate-500 font-medium dark:text-slate-400">Total Responses</h3><p className="text-3xl font-bold text-slate-800 mt-1 dark:text-slate-100">{responses.length}</p></Card>
                        {/* Other Stat cards */}
                     </div>
                    {selectedSurvey.questions.map(q => (
                        <Card key={q.id}>
                            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{q.title}</h3>
                            </div>
                            <div className="p-5">
                                {q.type === QuestionType.SingleChoice && (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={getChartData(q)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                            <XAxis dataKey="name" stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                                            <YAxis allowDecimals={false} stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                                            <Tooltip
                                                cursor={{ fill: isDarkMode ? 'rgba(129, 140, 248, 0.1)' : 'rgba(79, 70, 229, 0.1)' }}
                                                contentStyle={isDarkMode ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' } : { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                                labelStyle={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}
                                                itemStyle={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}
                                            />
                                            <Bar dataKey="value" fill={isDarkMode ? '#818cf8' : '#4f46e5'} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                                {q.type === QuestionType.Paragraph && (
                                    <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                                      {responses.map(r => r.answers[q.id] && (
                                        <div key={r.id} className="text-sm text-slate-800 bg-slate-50 p-3 rounded-md border border-slate-200 dark:text-slate-200 dark:bg-slate-700/50 dark:border-slate-700">{r.answers[q.id]}</div>
                                      ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16">
                     {selectedSurveyId ? <FileText className="mx-auto h-12 w-12 text-slate-400" /> : <BarChart2 className="mx-auto h-12 w-12 text-slate-400" />}
                    <p className="mt-2 text-slate-500 dark:text-slate-400">{selectedSurvey ? "No responses yet for this survey." : "Please select a survey to view analytics."}</p>
                </Card>
            )}
        </div>
    );
};

// --- SURVEY PREVIEW COMPONENTS ---

const SurveyPreviewPage: React.FC<{ survey: Survey, onExitPreview: () => void }> = ({ survey, onExitPreview }) => {
    return (
        <div className="bg-slate-100 min-h-screen font-sans dark:bg-slate-900">
            <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b z-10 dark:bg-slate-800/80 dark:border-slate-700">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <p className="font-semibold text-slate-700 flex items-center gap-2 dark:text-slate-200"><Icon name={Eye} className="h-5 w-5" /> Preview Mode</p>
                    <Button onClick={onExitPreview} variant="secondary">Exit Preview</Button>
                </div>
            </header>
            <main className="max-w-2xl mx-auto my-8 p-8 bg-white rounded-lg shadow-sm dark:bg-slate-800">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{survey.title}</h1>
                <p className="text-slate-600 mt-2 dark:text-slate-300">{survey.description}</p>
                <div className="mt-10 space-y-8">
                    {survey.questions.map((q, index) => (
                        <QuestionPreview key={q.id} question={q} index={index} />
                    ))}
                </div>
                <div className="mt-10 pt-6 border-t dark:border-slate-700">
                    <Button size="lg" className="w-full sm:w-auto">Submit Survey</Button>
                </div>
            </main>
        </div>
    );
};

const QuestionPreview: React.FC<{ question: Question, index: number }> = ({ question, index }) => {
    const { type, title, isRequired, options, scale, statements, choices } = question;

    const renderQuestionBody = () => {
        switch (type) {
            case QuestionType.SingleChoice:
                return (
                    <div className="space-y-3">
                        {options?.map(opt => (
                            <label key={opt.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-700">
                                <input type="radio" name={question.id} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-500" />
                                <span className="ml-3 text-slate-800 dark:text-slate-200">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                );
            case QuestionType.MultipleChoice:
                return (
                    <div className="space-y-3">
                        {options?.map(opt => (
                            <label key={opt.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-700">
                                <input type="checkbox" name={question.id} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 rounded dark:bg-slate-700 dark:border-slate-500" />
                                <span className="ml-3 text-slate-800 dark:text-slate-200">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                );
            case QuestionType.TextInput:
                return <Input placeholder="Type your answer here..." />;
            case QuestionType.Paragraph:
                return <Textarea placeholder="Type your answer here..." rows={4} />;
            case QuestionType.Dropdown:
                return (
                    <select className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                        <option value="">Select an option</option>
                        {options?.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                    </select>
                );
            case QuestionType.Rating:
                return (
                    <div className="flex items-center gap-2 flex-wrap">
                        {[...Array(scale)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center group">
                                <Star className="h-8 w-8 text-slate-300 hover:text-yellow-400 cursor-pointer transition-colors dark:text-slate-600 dark:hover:text-yellow-400" />
                                <span className="text-xs text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-400">{i+1}</span>
                            </div>
                        ))}
                    </div>
                );
            case QuestionType.Likert:
                 return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-center">
                            <thead>
                                <tr>
                                    <th className="text-left"></th>
                                    {choices?.map(c => <th key={c} className="text-sm font-medium text-slate-600 p-2 dark:text-slate-400">{c}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {statements?.map(s => (
                                    <tr key={s} className="border-t dark:border-slate-700">
                                        <td className="text-left font-medium text-slate-800 p-2 dark:text-slate-200">{s}</td>
                                        {choices?.map(c => (
                                            <td key={c} className="p-2">
                                                <input type="radio" name={`${question.id}-${s}`} className="h-4 w-4 text-primary-600 border-slate-300 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-500" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            default:
                return <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-md border dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400">Preview not available for this question type.</p>;
        }
    };

    return (
        <div className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0 dark:border-slate-700">
            <label className="block text-md font-semibold text-slate-800 dark:text-slate-100">
                {title} {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="mt-4">
                {renderQuestionBody()}
            </div>
        </div>
    );
};

// --- NEW PAGES ---
const ResponsesPage: React.FC = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.getSurveys().then(data => {
            setSurveys(data);
            if (data.length > 0) {
                setSelectedSurveyId(data[0].id);
            } else {
                setIsLoading(false);
            }
        });
    }, []);

    useEffect(() => {
        if (selectedSurveyId) {
            setIsLoading(true);
            api.getResponses(selectedSurveyId).then(data => {
                setResponses(data);
                setIsLoading(false);
            });
        }
    }, [selectedSurveyId]);

    const selectedSurveyTitle = surveys.find(s => s.id === selectedSurveyId)?.title || '...';

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Responses</h1>
                {surveys.length > 0 && (
                    <div className="w-full max-w-xs">
                         <select value={selectedSurveyId} onChange={e => setSelectedSurveyId(e.target.value)} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                            {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <Card>
                 <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Responses for "{selectedSurveyTitle}"</h2>
                </div>
                 {isLoading ? (
                    <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
                ) : responses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                                <tr>
                                    <th className="text-left font-semibold p-4">Response ID</th>
                                    <th className="text-left font-semibold p-4">Submitted At</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                               {responses.map(response => (
                                   <tr key={response.id} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                                       <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">{response.id}</td>
                                       <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(response.submittedAt).toLocaleString()}</td>
                                       <td className="p-4 text-right"><Button variant="secondary" size="sm">View</Button></td>
                                   </tr>
                               ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-10 text-center text-slate-500 dark:text-slate-400">No responses found for this survey.</p>
                )}
            </Card>
        </div>
    );
};

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.getUsers().then(data => {
            setUsers(data);
            setIsLoading(false);
        });
    }, []);

    return (
         <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">User Management</h1>
                <Button><Icon name={Plus} className="mr-2 h-4 w-4" /> Add User</Button>
            </div>
             <Card>
                 <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">All Users</h2>
                </div>
                 {isLoading ? (
                    <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                                <tr>
                                    <th className="text-left font-semibold p-4">Name</th>
                                    <th className="text-left font-semibold p-4">Email</th>
                                    <th className="text-left font-semibold p-4">Role</th>
                                    <th className="text-left font-semibold p-4">Joined</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                               {users.map(user => (
                                   <tr key={user.id} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                                       <td className="p-4 font-medium text-slate-800 flex items-center gap-3 dark:text-slate-100">
                                            <img src={user.profilePictureUrl} className="h-8 w-8 rounded-full" />
                                            {user.name}
                                       </td>
                                       <td className="p-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                                       <td className="p-4 text-slate-600 capitalize dark:text-slate-300">
                                            <span className="flex items-center gap-2">
                                                <Icon name={ROLE_CONFIG[user.role].icon} className="h-4 w-4 text-slate-400" />
                                                {user.role}
                                            </span>
                                        </td>
                                       <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(user.createdAt).toLocaleDateString()}</td>
                                       <td className="p-4 text-right">
                                            <DropdownMenu trigger={<Button variant="ghost" size="sm" className="!px-2"><MoreHorizontal className="h-4 w-4" /></Button>}>
                                                <DropdownMenuItem icon={Edit} onClick={() => {}}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem icon={Trash2} onClick={() => {}} className="text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10">Delete</DropdownMenuItem>
                                            </DropdownMenu>
                                       </td>
                                   </tr>
                               ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({ name: '', email: '' });
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        api.getCurrentUser().then(user => {
            setCurrentUser(user);
            setFormData({ name: user.name, email: user.email });
        });
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if(currentUser) {
            const updatedUser = await api.updateUser(currentUser.id, { name: formData.name, email: formData.email });
            setCurrentUser(updatedUser);
            alert("Profile updated successfully!");
        }
    };

    if (!currentUser) {
        return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>;
    }

    const isDarkMode = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6 dark:text-slate-100">Settings</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1">
                     <nav className="space-y-1">
                        <button onClick={() => setActiveTab('profile')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary-50 text-primary-700 font-semibold dark:bg-primary-500/10 dark:text-primary-400' : 'hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                            <Icon name={UserIcon} className="mr-3"/> Profile
                        </button>
                         <button onClick={() => setActiveTab('app')} className={`w-full text-left flex items-center p-3 rounded-lg transition-colors ${activeTab === 'app' ? 'bg-primary-50 text-primary-700 font-semibold dark:bg-primary-500/10 dark:text-primary-400' : 'hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                            <Icon name={Settings} className="mr-3"/> Application
                        </button>
                    </nav>
                </div>
                <div className="col-span-3">
                    <Card>
                        {activeTab === 'profile' && (
                            <form onSubmit={handleUpdate}>
                                <div className="p-6 border-b dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Profile Information</h3>
                                    <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Update your account's profile information and email address.</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Name</label>
                                        <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Email</label>
                                        <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-6 py-4 rounded-b-lg flex justify-end dark:bg-slate-800/50">
                                    <Button type="submit">Save Changes</Button>
                                </div>
                            </form>
                        )}
                         {activeTab === 'app' && (
                             <>
                                <div className="p-6 border-b dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Appearance</h3>
                                    <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Choose how the application looks. This will be saved for your next visit.</p>
                                </div>
                                <div className="p-6">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name={isDarkMode ? Moon : Sun} className="text-slate-500 dark:text-slate-400" />
                                            <span className="font-medium text-slate-700 dark:text-slate-300">Dark Mode</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isDarkMode}
                                                onChange={toggleTheme}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-slate-700 peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>
                                </div>
                             </>
                         )}
                    </Card>
                </div>
            </div>
        </div>
    );
};


const AppLayout: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [isNavOpen, setNavOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User|null>(null);
    const location = useLocation();
    const isSurveyBuilderPage = location.pathname.includes('/survey/') && location.pathname.includes('/edit');

    useEffect(() => {
        api.getCurrentUser().then(setCurrentUser);
    }, []);

    return (
         <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <Sidebar navOpen={isNavOpen} setNavOpen={setNavOpen} currentUser={currentUser} />
             <div className="flex-1 flex flex-col overflow-hidden">
                {!isSurveyBuilderPage && <Header onNavToggle={() => setNavOpen(!isNavOpen)} />}
                <main className={`flex-1 overflow-x-hidden overflow-y-auto ${isSurveyBuilderPage ? '' : 'p-6'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    {/* Survey Builder doesn't use the main AppLayout padding/header */}
                    <Route path="/survey/:id/edit" element={<SurveyBuilder />} />
                    
                    {/* All other routes use the main AppLayout */}
                    <Route path="/*" element={
                        <AppLayout>
                            <Routes>
                                <Route path="/analytics" element={<AnalyticsDashboard />} />
                                <Route path="/survey/:id/analytics" element={<AnalyticsDashboard />} />
                                <Route path="/responses" element={<ResponsesPage />} />
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/" element={<Dashboard />} />
                            </Routes>
                        </AppLayout>
                    } />
                </Routes>
            </HashRouter>
        </ThemeProvider>
    );
}
