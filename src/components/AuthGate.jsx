import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { C, glass, btn, inp, lbl, R, CC } from '../lib/theme';
import { getToken, setToken, clearToken, sendOtp, verifyOtp, fetchMe } from '../lib/authApi';
import LandingPage from './LandingPage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); // landing | signin (while signedOut)
  const [step, setStep] = useState('email'); // email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const restore = useCallback(async () => {
    if (!getToken()) { setStatus('signedOut'); return; }
    try {
      const { user } = await fetchMe();
      setUser(user);
      setStatus('signedIn');
    } catch {
      clearToken();
      setStatus('signedOut');
    }
  }, []);

  useEffect(() => { restore(); }, [restore]);

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      await sendOtp(email.trim());
      setStep('code');
      toast.success('Code sent — check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code.'); return; }
    setBusy(true);
    try {
      const { token, user } = await verifyOtp(email.trim(), code.trim());
      setToken(token);
      setUser(user);
      setStatus('signedIn');
      toast.success('Signed in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'checking') {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg}}>
        <Loader2 className="spin" size={22} color={C.blueL} />
      </div>
    );
  }

  if (status === 'signedIn') {
    return children({ user, setUser });
  }

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('signin')} />;
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg,padding:20}}>
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{...glass({width:'100%',maxWidth:380,padding:32})}}>
        <button onClick={()=>setView('landing')} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:C.t3,fontSize:12,fontFamily:C.FB,padding:0,marginBottom:18}}>
          <ArrowLeft size={13} /> Back to home
        </button>
        <div style={R({gap:10,marginBottom:22})}>
          <div style={{width:34,height:34,borderRadius:9,overflow:'hidden'}}><img src="/icon.svg" width={34} height={34} alt="" /></div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.t1,fontFamily:C.FD}}>MedSchoolPrep</div>
            <div style={{fontSize:9,color:C.t3,letterSpacing:'.1em',textTransform:'uppercase'}}>YOUR PATH INTO MEDICINE</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form key="email" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onSubmit={handleSendCode}>
              <div style={CC({gap:16})}>
                <div>
                  <div style={{fontSize:18,fontWeight:800,color:C.t1,fontFamily:C.FD,marginBottom:4}}>Sign in</div>
                  <div style={{fontSize:13,color:C.t2}}>We'll email you a 6-digit code — no password needed.</div>
                </div>
                <div>
                  <label style={lbl()}>Email</label>
                  <div style={{position:'relative'}}>
                    <Mail size={15} color={C.t3} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}} />
                    <input autoFocus type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp({paddingLeft:36})} />
                  </div>
                </div>
                {error && <div style={{fontSize:12,color:C.roseL}}>{error}</div>}
                <button type="submit" disabled={busy} style={btn(C.blueGrad,{width:'100%',opacity:busy?0.7:1})}>
                  {busy ? 'Sending…' : <>Send code <ArrowRight size={14}/></>}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form key="code" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onSubmit={handleVerify}>
              <div style={CC({gap:16})}>
                <div>
                  <div style={{fontSize:18,fontWeight:800,color:C.t1,fontFamily:C.FD,marginBottom:4}}>Enter your code</div>
                  <div style={{fontSize:13,color:C.t2}}>Sent to <strong style={{color:C.t1}}>{email}</strong></div>
                </div>
                <div>
                  <label style={lbl()}>6-digit code</label>
                  <div style={{position:'relative'}}>
                    <ShieldCheck size={15} color={C.t3} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}} />
                    <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="123456" style={inp({paddingLeft:36,letterSpacing:'.3em',fontFamily:C.FM})} />
                  </div>
                </div>
                {error && <div style={{fontSize:12,color:C.roseL}}>{error}</div>}
                <button type="submit" disabled={busy} style={btn(C.blueGrad,{width:'100%',opacity:busy?0.7:1})}>
                  {busy ? 'Verifying…' : <>Verify & continue <ArrowRight size={14}/></>}
                </button>
                <button type="button" onClick={()=>{setStep('email');setCode('');setError('');}} style={{background:'none',border:'none',color:C.t3,fontSize:12,cursor:'pointer',fontFamily:C.FB}}>
                  Use a different email
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
