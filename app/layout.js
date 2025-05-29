import './globals.css'



// app/layout.js
export const metadata = {
  title: 'AG HelpDesk',
  description: 'Internal ticket management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}</body>
    </html>
  );
}
