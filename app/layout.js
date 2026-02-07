import './globals.css';

export const metadata = {
  title: 'RegulaPM Nexus - AI Governed Product Decisions',
  description: 'Generate auditable PRDs, stakeholder critiques, and compliance checklists from a single product change.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
