
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, Project, Task, Payment, Contact, Meeting, UserRole, TaskStatus } from './types.ts';
import { db } from './firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, setDoc
} from 'firebase/firestore';

interface DataContextType {
  currentUser: User | null;
  projects: Project[];
  tasks: Task[];
  payments: Payment[];
  users: User[];
  contacts: Contact[];
  meetings: Meeting[];
  loading: boolean;
  saving: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  addProject: (p: Project) => Promise<string | void>;
  updateProject: (id: string, p: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (t: Task) => Promise<void>;
  updateTask: (id: string, t: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addPayment: (p: Payment) => Promise<void>;
  updatePayment: (id: string, p: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  updateUser: (id: string, u: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addContact: (c: Contact) => Promise<void>;
  updateContact: (id: string, c: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addMeeting: (m: Meeting) => Promise<void>;
  updateMeeting: (id: string, m: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

// Initial Mock Data to ensure the system isn't empty on load
const MOCK_USERS: User[] = [
  { id: 'mock-user-1', name: 'ישראל ישראלי', username: 'admin', email: 'admin@nihulit.co.il', role: UserRole.SYS_ADMIN, organizationId: 'o1', active: true }
];

const MOCK_PROJECTS: Project[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode, currentUser: User | null }> = ({ children, currentUser }) => {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load data from Firebase on mount
  useEffect(() => {
    const loadDataFromFirebase = async () => {
      try {
        setLoading(true);
        
        // Load projects
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsData = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Project));
        if (projectsData.length > 0) setProjects(projectsData);

        // Load tasks
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const tasksData = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));
        setTasks(tasksData);

        // Load payments
        const paymentsSnapshot = await getDocs(collection(db, 'payments'));
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Payment));
        setPayments(paymentsData);

        // Load users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        if (usersData.length > 0) setUsers(usersData);

        // Load contacts
        const contactsSnapshot = await getDocs(collection(db, 'contacts'));
        const contactsData = contactsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Contact));
        setContacts(contactsData);

        // Load meetings
        const meetingsSnapshot = await getDocs(collection(db, 'meetings'));
        const meetingsData = meetingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Meeting));
        setMeetings(meetingsData);

        // Data loaded successfully - no logging needed
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataFromFirebase();
  }, []);

  // Filter projects by user access
  const filteredProjects = useMemo(() => {
    if (!currentUser) return [];
    
    // Check if admin - handle both enum and string values
    const isAdmin = currentUser.role === UserRole.SYS_ADMIN || 
                    currentUser.role === 'SYS_ADMIN' ||
                    currentUser.role === 'sys_admin';
    
    // If admin or role contains admin, return all projects
    if (isAdmin || (typeof currentUser.role === 'string' && currentUser.role.toUpperCase().includes('ADMIN'))) {
      return projects.filter(p => !p.isDeleted);
    }
    
    // Otherwise filter by accessible projects
    return projects.filter(p => !p.isDeleted && currentUser.accessibleProjects?.includes(p.id));
  }, [projects, currentUser]);

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    const projectIds = filteredProjects.map(p => p.id);
    return tasks.filter(t => projectIds.includes(t.projectId));
  }, [tasks, filteredProjects, currentUser]);

  // Login function
  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      // Load users from Firebase if not loaded
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Find user by email and active status
      const user = usersData.find(u => u.email === email && u.active);
      
      if (!user) {
        return null;
      }

      // Check if user has password field
      if (!user.password) {
        return null;
      }

      // Check password - compare with stored password
      if (user.password !== password) {
        return null;
      }

      // Save user session with 30-day expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      const session = {
        userId: user.id,
        expiryTime: expiryDate.getTime()
      };
      
      // Prepare user object without password for storage
      // Map Firebase role strings to UserRole enum
      let mappedRole = UserRole.VIEWER;
      if (user.role === 'SYS_ADMIN' || user.role === UserRole.SYS_ADMIN) {
        mappedRole = UserRole.SYS_ADMIN;
      } else if (user.role === 'PM_ADMIN' || user.role === UserRole.PM_ADMIN) {
        mappedRole = UserRole.PM_ADMIN;
      } else if (user.role === 'WORKER' || user.role === UserRole.WORKER) {
        mappedRole = UserRole.WORKER;
      }

      const userToStore: User = {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.name || user.email.split('@')[0],
        role: mappedRole,
        organizationId: user.orgId || user.organizationId || 'unknown',
        active: user.active,
        accessibleProjects: user.accessibleProjects
      };
      
      localStorage.setItem('nihulit_session', JSON.stringify(session));
      localStorage.setItem('nihulit_user', JSON.stringify(userToStore));

      return userToStore;
    } catch (error) {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('nihulit_session');
    localStorage.removeItem('nihulit_user');
  };

  // Local State Operations with Firebase sync
  const addProject = async (p: Project) => {
    try {
      setSaving(true);
      // אל תשתמש בID שהוגדר בצד הקליינט - תן ל Firebase ליצור את ה ID
      const { id, ...projectData } = p;
      const docRef = await addDoc(collection(db, 'projects'), projectData);
      // השתמש בID ש Firebase יצר
      setProjects(prev => [...prev, { ...projectData, id: docRef.id } as Project]);
      return docRef.id;
    } catch (error) {
      console.error('Error adding project:', error);
      // אם יש שגיאה, שמור את הפרויקט עם ה ID הקליינט כ fallback
      setProjects(prev => [...prev, p]);
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (id: string, p: Partial<Project>) => {
    try {
      setSaving(true);
      const projectDoc = doc(db, 'projects', id);
      
      try {
        // נסה לעדכן את הדוקומנט
        await updateDoc(projectDoc, p);
      } catch (error: any) {
        // אם הדוקומנט לא קיים, צור אותו עם הנתונים הנוכחיים ועם העדכונים
        if (error.code === 'not-found') {
          const currentProject = projects.find(proj => proj.id === id);
          if (currentProject) {
            await setDoc(projectDoc, { ...currentProject, ...p });
          }
        } else {
          throw error;
        }
      }
      
      // עדכן את ה-state
      setProjects(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    } catch (error) {
      console.error('Error updating project:', error);
      // fallback: עדכן את ה-state בלבד
      setProjects(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setSaving(true);
      await deleteDoc(doc(db, 'projects', id));
      setProjects(prev => prev.map(item => item.id === id ? { ...item, isDeleted: true } : item));
    } catch (error) {
      console.error('Error deleting project from Firebase:', error);
      setProjects(prev => prev.map(item => item.id === id ? { ...item, isDeleted: true } : item));
    } finally {
      setSaving(false);
    }
  };
  
  const addTask = async (t: Task) => {
    try {
      setSaving(true);
      const { id, ...taskData } = t;
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      setTasks(prev => [...prev, { ...taskData, id: docRef.id } as Task]);
    } catch (error) {
      console.error('Error adding task to Firebase:', error);
      setTasks(prev => [...prev, t]);
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (id: string, t: Partial<Task>) => {
    try {
      setSaving(true);
      const currentTask = tasks.find(task => task.id === id);
      const today = new Date().toISOString().split('T')[0];
      
      // עדכן תאריכים בפועל אוטומטית בהתאם לשינוי סטטוס
      if (t.status) {
        if (t.status === TaskStatus.IN_PROGRESS && currentTask?.status === TaskStatus.NOT_STARTED) {
          t.actualStartDate = today;
        }
        if (t.status === TaskStatus.DONE) {
          t.actualEndDate = today;
        }
      }
      
      const taskDoc = doc(db, 'tasks', id);
      try {
        await updateDoc(taskDoc, t);
      } catch (error: any) {
        if (error.code === 'not-found' && currentTask) {
          await setDoc(taskDoc, { ...currentTask, ...t });
          console.log('Task migrated to Firebase (document created):', id);
        } else {
          throw error;
        }
      }
      
      // עדכן את ה-state ותוודא שאנחנו משתמשים בערך המתורגם
      setTasks(prev => {
        const updatedTasks = prev.map(item => item.id === id ? { ...item, ...t } : item);
        
        // אם משימה הסתיימה, עדכן את משימות תלויות אוטומטית
        if (t.status === TaskStatus.DONE) {
          const dependentTasks = updatedTasks.filter(task => task.dependsOnTaskId === id && task.status === TaskStatus.NOT_STARTED);
          
          // עדכן כל משימה תלויה ב-Firebase
          dependentTasks.forEach(depTask => {
            updateDoc(doc(db, 'tasks', depTask.id), { status: TaskStatus.IN_PROGRESS }).catch(err => {
              console.error('Error updating dependent task:', err);
            });
          });
          
          // עדכן את ה-state של כל המשימות התלויות
          return updatedTasks.map(item => 
            dependentTasks.some(depTask => depTask.id === item.id) 
              ? { ...item, status: TaskStatus.IN_PROGRESS } 
              : item
          );
        }
        
        return updatedTasks;
      });
    } catch (error) {
      console.error('Error updating task in Firebase:', error);
      setTasks(prev => prev.map(item => item.id === id ? { ...item, ...t } : item));
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setSaving(true);
      await deleteDoc(doc(db, 'tasks', id));
      setTasks(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting task from Firebase:', error);
      setTasks(prev => prev.filter(item => item.id !== id));
    } finally {
      setSaving(false);
    }
  };
  
  const addPayment = async (p: Payment) => {
    try {
      setSaving(true);
      const { id, ...paymentData } = p;
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      setPayments(prev => [...prev, { ...paymentData, id: docRef.id } as Payment]);
    } catch (error) {
      console.error('Error adding payment to Firebase:', error);
      setPayments(prev => [...prev, p]);
    } finally {
      setSaving(false);
    }
  };

  const updatePayment = async (id: string, p: Partial<Payment>) => {
    try {
      setSaving(true);
      const paymentDoc = doc(db, 'payments', id);
      const currentPayment = payments.find(payment => payment.id === id);
      
      try {
        await updateDoc(paymentDoc, p);
      } catch (error: any) {
        if (error.code === 'not-found' && currentPayment) {
          await setDoc(paymentDoc, { ...currentPayment, ...p });
          console.log('Payment migrated to Firebase (document created):', id);
        } else {
          throw error;
        }
      }
      
      setPayments(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    } catch (error) {
      console.error('Error updating payment in Firebase:', error);
      setPayments(prev => prev.map(item => item.id === id ? { ...item, ...p } : item));
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'payments', id));
      setPayments(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting payment from Firebase:', error);
      setPayments(prev => prev.filter(item => item.id !== id));
    }
  };
  
  const addUser = async (u: User) => {
    try {
      setSaving(true);
      const { id, ...userData } = u;
      const docRef = await addDoc(collection(db, 'users'), userData);
      setUsers(prev => [...prev, { ...userData, id: docRef.id } as User]);
    } catch (error) {
      console.error('Error adding user to Firebase:', error);
      setUsers(prev => [...prev, u]);
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, u: Partial<User>) => {
    try {
      setSaving(true);
      const userDoc = doc(db, 'users', id);
      const currentUser = users.find(user => user.id === id);
      
      try {
        await updateDoc(userDoc, u);
      } catch (error: any) {
        if (error.code === 'not-found' && currentUser) {
          await setDoc(userDoc, { ...currentUser, ...u });
          console.log('User migrated to Firebase (document created):', id);
        } else {
          throw error;
        }
      }
      
      setUsers(prev => prev.map(item => item.id === id ? { ...item, ...u } : item));
    } catch (error) {
      console.error('Error updating user in Firebase:', error);
      setUsers(prev => prev.map(item => item.id === id ? { ...item, ...u } : item));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting user from Firebase:', error);
      setUsers(prev => prev.filter(item => item.id !== id));
    }
  };
  
  const addContact = async (c: Contact) => {
    try {
      setSaving(true);
      const { id, ...contactData } = c;
      const docRef = await addDoc(collection(db, 'contacts'), contactData);
      setContacts(prev => [...prev, { ...contactData, id: docRef.id } as Contact]);
    } catch (error) {
      console.error('Error adding contact to Firebase:', error);
      setContacts(prev => [...prev, c]);
    } finally {
      setSaving(false);
    }
  };

  const updateContact = async (id: string, c: Partial<Contact>) => {
    try {
      setSaving(true);
      const contactDoc = doc(db, 'contacts', id);
      const currentContact = contacts.find(contact => contact.id === id);
      
      try {
        await updateDoc(contactDoc, c);
      } catch (error: any) {
        if (error.code === 'not-found' && currentContact) {
          await setDoc(contactDoc, { ...currentContact, ...c });
          console.log('Contact migrated to Firebase (document created):', id);
        } else {
          throw error;
        }
      }
      
      setContacts(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    } catch (error) {
      console.error('Error updating contact in Firebase:', error);
      setContacts(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      setContacts(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting contact from Firebase:', error);
      setContacts(prev => prev.filter(item => item.id !== id));
    }
  };

  const addMeeting = async (m: Meeting) => {
    try {
      setSaving(true);
      const meetingData = { ...m } as any;
      delete meetingData.id;
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      setMeetings(prev => [...prev, { ...m, id: docRef.id } as Meeting]);
    } catch (error) {
      console.error('Error adding meeting to Firebase:', error);
      setMeetings(prev => [...prev, m]);
    } finally {
      setSaving(false);
    }
  };

  const updateMeeting = async (id: string, m: Partial<Meeting>) => {
    try {
      setSaving(true);
      const meetingDoc = doc(db, 'meetings', id);
      const currentMeeting = meetings.find(meeting => meeting.id === id);

      try {
        await updateDoc(meetingDoc, m);
      } catch (error: any) {
        if (error.code === 'not-found' && currentMeeting) {
          await setDoc(meetingDoc, { ...currentMeeting, ...m });
          console.log('Meeting migrated to Firebase (document created):', id);
        } else {
          throw error;
        }
      }

      setMeetings(prev => prev.map(item => item.id === id ? { ...item, ...m } : item));
    } catch (error) {
      console.error('Error updating meeting in Firebase:', error);
      setMeetings(prev => prev.map(item => item.id === id ? { ...item, ...m } : item));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      setMeetings(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting meeting from Firebase:', error);
      setMeetings(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <DataContext.Provider value={{ 
      currentUser, projects: filteredProjects, tasks: filteredTasks, payments, users, contacts, meetings, loading, saving,
       login, logout,
      addProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask,
      addPayment, updatePayment, deletePayment,
      addUser, updateUser, deleteUser,
      addContact, updateContact, deleteContact,
      addMeeting, updateMeeting, deleteMeeting
    }}>
      {children}
    </DataContext.Provider>
  );
};
