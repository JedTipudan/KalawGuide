import { Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export function WebAppShell({ children }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100%; height: 100%;
          overflow-x: hidden;
        }
        #root {
          width: 100%; min-height: 100vh;
          display: flex; flex-direction: column;
        }
      `}</style>
      {children}
    </>
  );
}
