import LegacyHome from './LegacyHome';
import StudentWorkspace from './student/page';
export default function Home(){return process.env.COACH_MANAGED_ENABLED==='true'?<StudentWorkspace/>:<LegacyHome/>;}
