import type { Metadata } from 'next';
import ContactsClient from './ContactsClient';
export const metadata: Metadata = { title: 'Contacts' };
export default function ContactsPage() { return <ContactsClient />; }
