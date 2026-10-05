// Public UI composition boundary. Internals import leaf modules, never this barrel.
// Shared domain components consume the headless index.ts instead.
export { TeacherParticipantList } from './components/teacher/TeacherParticipantList';
export { StudentParticipantList } from './components/student/StudentParticipantList';
export { TeacherActivityList } from './components/teacher/TeacherActivityList';
export { StudentActivityList } from './components/student/StudentActivityList';
export { TeacherClassroomList } from './components/teacher/TeacherClassroomList';
export { TeacherClassroomCreateFlow } from './components/teacher/TeacherClassroomCreateFlow';
export { useTeacherClassroomCreation } from './hooks/useTeacherClassroomCreation';
export { useTeacherClassroomDetail } from './hooks/useTeacherClassroomDetail';
