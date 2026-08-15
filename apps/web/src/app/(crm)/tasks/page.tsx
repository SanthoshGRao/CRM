import type { Metadata } from 'next';
import TasksClient from './TasksClient';
export const metadata: Metadata = { title: 'Tasks' };
export default function TasksPage() { return <TasksClient />; }
