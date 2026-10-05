import React from 'react';
import { useAppContext } from '../context';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, BrainCircuit, Sparkles, GraduationCap } from 'lucide-react';

export function RoleSelection() {
  const { setRole } = useAppContext();

  return (
    <div className="min-h-screen flex w-full bg-fox-bg font-sans">
      {/* Left Panel - Branding & Value Prop (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-fox-orange relative flex-col justify-between p-16 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-fox-surface/20 to-transparent blur-3xl"></div>
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-fox-gold/40 to-transparent blur-3xl"></div>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        </div>

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-16"
          >
            <img src="/logo.png" alt="FoxMind Logo" className="h-16 w-auto object-contain" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-5xl font-heading font-bold text-white leading-tight mb-6">
              Tu copiloto <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fox-surface to-orange-200">pedagógico inteligente.</span>
            </h2>
            <p className="text-lg text-orange-50 max-w-md leading-relaxed mb-12">
              Transformando la educación secundaria con inteligencia artificial adaptativa. Potenciamos a los docentes y personalizamos el aprendizaje de cada alumno.
            </p>

            <div className="space-y-6">
              <FeatureItem icon={BrainCircuit} text="Tutoría socrática 24/7 con Foxy" />
              <FeatureItem icon={BookOpen} text="Planificación y corrección automatizada" />
              <FeatureItem icon={Sparkles} text="Accesibilidad DUA integrada" />
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-sm text-orange-100/80 font-medium">
          © {new Date().getFullYear()} FoxMind EdTech. Demo interactiva.
        </div>
      </div>

      {/* Right Panel - Login / Role Selection */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-8 left-8 flex lg:hidden items-center gap-2">
          <img src="/logo.png" alt="FoxMind Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="w-full max-w-md space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-fox-text-main mb-3">
              Iniciar Sesión
            </h2>
            <p className="text-fox-text-muted text-lg">
              Ingresa tus credenciales para acceder a la plataforma.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-5"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-fox-text-main mb-1.5" htmlFor="email">
                  Correo o Usuario
                </label>
                <input 
                  type="text" 
                  id="email"
                  placeholder="ejemplo@escuela.edu.ar"
                  className="w-full bg-fox-surface border border-fox-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/50 transition-all text-fox-text-main font-medium"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-fox-text-main" htmlFor="password">
                    Contraseña
                  </label>
                  <a href="#" className="flex text-xs font-bold text-fox-orange hover:text-fox-orange/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <input 
                  type="password" 
                  id="password"
                  placeholder="••••••••"
                  className="w-full bg-fox-surface border border-fox-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/50 transition-all text-fox-text-main font-medium"
                />
              </div>
            </div>

            <button 
              className="w-full bg-fox-orange hover:bg-fox-orange/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2"
              onClick={() => alert("Por favor, utiliza los botones de demostración abajo.")}
            >
              Ingresar <ArrowRight size={18} />
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-fox-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-fox-bg px-4 text-xs font-bold text-fox-text-muted uppercase tracking-wider">
                  Demostración Rápida
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Docente Profile Card */}
              <button 
                onClick={() => setRole('docente')}
                className="w-full group bg-fox-surface border border-fox-border hover:border-fox-primary rounded-xl p-3 transition-all duration-200 hover:shadow-md flex flex-col items-center gap-2 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-fox-primary/10 flex items-center justify-center text-fox-primary flex-shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fox-text-main">Soy Docente</h3>
                </div>
              </button>

              {/* Alumno Profile Card */}
              <button 
                onClick={() => setRole('alumno')}
                className="w-full group bg-fox-surface border border-fox-border hover:border-fox-purple rounded-xl p-3 transition-all duration-200 hover:shadow-md flex flex-col items-center gap-2 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-fox-purple/10 flex items-center justify-center text-fox-purple flex-shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fox-text-main">Soy Alumno</h3>
                </div>
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
          >
            <p className="text-xs text-fox-text-muted/70">
              Al ingresar a la demo, aceptas los términos de uso simulados de FoxMind.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full shrink-0 bg-fox-surface/10 flex items-center justify-center text-white backdrop-blur-sm border border-fox-surface/10">
        <Icon size={20} />
      </div>
      <span className="text-orange-50 font-medium">{text}</span>
    </div>
  );
}
