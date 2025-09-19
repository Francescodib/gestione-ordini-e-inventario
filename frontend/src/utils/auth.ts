import type { AuthContextType } from '../types/auth';

export const createAuthHook = (context: React.Context<AuthContextType | undefined>) => {
  return (): AuthContextType => {
    const authContext = React.useContext(context);
    if (authContext === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return authContext;
  };
};