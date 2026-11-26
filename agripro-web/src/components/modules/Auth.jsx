import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconPlant, IconMail, IconLock, IconLoader2, IconUser } from '@tabler/icons-react';
import Button from '../shared/Button';
import { toast } from '../../utils/toast';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation is switched off: the user is already signed in and
          // onAuthStateChange will swap this screen out. Nothing to announce.
          return;
        }

        // Supabase hides whether an address is already registered, returning a user with
        // no identities instead of an error. Surface that as its own message rather than
        // telling someone to check an inbox that will stay empty.
        const alreadyRegistered = data.user && (data.user.identities?.length ?? 0) === 0;
        setNotice(
          alreadyRegistered
            ? `An account already exists for ${email}. Try signing in, or reset your password.`
            : `Account created. We sent a confirmation link to ${email} — click it, then sign in. Check your spam folder if it does not arrive within a few minutes.`
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      // Unconfirmed accounts fail sign-in with a message that does not explain the fix.
      if (/email not confirmed/i.test(err.message)) {
        setError('This email has not been confirmed yet. Please click the confirmation link we sent you, then try again.');
      } else {
        setError(err.message);
      }
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4 shadow-lg shadow-primary/20">
            <IconPlant size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">AgriPro Farm Manager</h1>
          <p className="text-text-muted text-sm mt-1">Manage your fields with modern intelligence.</p>
        </div>

        <div className="agri-card p-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-100 text-expense text-xs font-bold animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}

            {notice && (
              <div role="status" className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-800 text-xs font-bold animate-in fade-in zoom-in duration-200">
                {notice}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1">
                <label htmlFor="auth-fullname" className="agri-label">Full Name</label>
                <div className="relative h-11">
                  <IconUser
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    size={20}
                  />
                  <input
                    id="auth-fullname"
                    type="text"
                    className="agri-input pl-10 h-full"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="auth-email" className="agri-label">Email Address</label>
              <div className="relative h-11">
                <IconMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  size={20}
                />
                <input
                  id="auth-email"
                  type="email"
                  className="agri-input pl-10 h-full"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="auth-password" className="agri-label">Password</label>
              <div className="relative h-11">
                <IconLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  size={20}
                />
                <input
                  id="auth-password"
                  type="password"
                  className="agri-input pl-10 h-full"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <IconLoader2 className="animate-spin" size={20} />
              ) : (
                isSignUp ? 'Get Started' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setNotice(null); }}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-text-muted mt-8 font-bold uppercase tracking-widest">
          v4.0 | AgriPro Manager
        </p>
      </div>
    </div>
  );
};

export default Auth;
