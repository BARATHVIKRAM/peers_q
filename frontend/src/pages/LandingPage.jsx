import { Link } from 'react-router-dom'
import { Zap, Users, BarChart2, Brain, ChevronRight, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-electric-purple/5 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-electric-blue rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-navy-950" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-xl text-white">PeersQ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/join" className="text-navy-300 hover:text-white transition-colors font-body text-sm px-4 py-2">
            Join Quiz
          </Link>
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">Login</Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 text-sm text-electric-blue">
          <Star size={14} fill="currentColor" />
          <span>Real-time quizzes for up to 50 participants</span>
        </div>

        <h1 className="font-display font-bold text-6xl md:text-7xl lg:text-8xl leading-none mb-6">
          <span className="gradient-text">Engage.</span>
          <br />
          <span className="text-white">Learn. Compete.</span>
        </h1>

        <p className="text-navy-300 text-xl max-w-2xl mx-auto mb-10 font-body leading-relaxed">
          Create live interactive quizzes, upload documents for AI-generated questions,
          and watch your audience compete in real time with beautiful leaderboards.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
            Create Your First Quiz
            <ChevronRight size={18} />
          </Link>
          <Link to="/join" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
            Join with Code
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {[
            { icon: Brain, title: 'AI Quiz Generation', desc: 'Upload PDF or docs and generate quizzes instantly with Groq AI', color: 'text-electric-blue' },
            { icon: Users, title: 'Up to 50 Players', desc: 'Real-time synchronized sessions with zero lag via WebSockets', color: 'text-electric-cyan' },
            { icon: Zap, title: 'Live Leaderboard', desc: 'Scores update instantly after every question with animations', color: 'text-accent-gold' },
            { icon: BarChart2, title: 'QR Code Join', desc: 'Participants join instantly by scanning a QR code or entering a 6-digit code', color: 'text-accent-mint' }
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card hover:border-electric-blue/30 transition-all duration-300 group">
              <div className={`${color} mb-3`}>
                <Icon size={28} />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
              <p className="text-navy-300 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
