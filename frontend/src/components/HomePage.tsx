import React from 'react';
import { FaCamera, FaEye, FaBell, FaDatabase, FaLinkedin, FaEnvelope, FaGithub } from 'react-icons/fa';
import { GiWaveSurfer } from 'react-icons/gi';
import { MdMonitorHeart } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  const handleStartLogin = () => {
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center py-4 px-8 shadow-sm bg-white sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <span className="text-3xl">💙</span> AuraCare
        </h1>
        <div className="flex gap-6 text-gray-600 font-medium">
          <a href="#about" className="hover:text-blue-700">About</a>
          <a href="#features" className="hover:text-blue-700">Features</a>
          <a href="#how-it-works" className="hover:text-blue-700">How It Works</a>
          <a href="#impact" className="hover:text-blue-700">Impact</a>
          <a href="#contact" className="hover:text-blue-700">Contact</a>
        </div>
        <button
          onClick={handleStartLogin}
          className="bg-blue-700 text-white px-5 py-2 rounded-full hover:bg-blue-800 transition"
        >
          Dashboard
        </button>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-50 to-white py-20 text-center px-4">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          AI-Powered Emotional Care for Patients
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
          AuraCare revolutionizes ICU care by combining cutting-edge AI with compassionate interventions — improving patient well-being, supporting medical staff, and engaging families.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleStartLogin}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition"
          >
            Get Started
          </button>
          <a
            href="#features"
            className="border border-blue-700 text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-50 transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 px-8 max-w-5xl mx-auto text-center">
        <h3 className="text-3xl font-bold mb-4">Why AuraCare?</h3>
        <p className="text-gray-600 text-lg">
          Patients unable to speak or express emotions often go unheard. Vital signs alone can't capture emotional distress, leading to slower recovery. AuraCare continuously detects emotional states and delivers personalized interventions — all while ensuring privacy and security.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16 px-8">
        <h3 className="text-3xl font-bold text-center mb-12">Our Advanced Solution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard icon={<FaCamera size={32} className="text-blue-700" />} title="AI Emotion Detection" desc="Advanced computer vision and AI models analyze facial expressions in real-time." points={['Real-time facial analysis', 'Emotion classification', 'Stress level assessment', 'Non-invasive monitoring']} />
          <FeatureCard icon={<FaEye size={32} className="text-blue-700" />} title="Continuous Monitoring" desc="24/7 contactless observation without wearables." points={['24/7 surveillance', 'Contactless technology', 'No patient disruption', 'Comprehensive tracking']} />
          <FeatureCard icon={<GiWaveSurfer size={32} className="text-blue-700" />} title="Automated Interventions" desc="Soothing visuals, calming sounds, and lighting adjustments." points={['Soothing visuals', 'Calming audio', 'Ambient lighting', 'Personalized responses']} />
          <FeatureCard icon={<FaBell size={32} className="text-blue-700" />} title="Instant Alerts" desc="Immediate notifications for distress signs." points={['Real-time alerts', 'Dashboard integration', 'Smartwatch notifications', 'Priority escalation']} />
          <FeatureCard icon={<FaDatabase size={32} className="text-blue-700" />} title="Secure Data Tracking" desc="Encrypted emotion history logs for insights." points={['AES-256 encryption', 'Historical analysis', 'Predictive insights', 'Secure storage']} />
          <FeatureCard icon={<MdMonitorHeart size={32} className="text-blue-700" />} title="Clinical Integration" desc="Seamless integration with hospital EMRs." points={['EMR integration', 'System compatibility', 'Workflow optimization', 'Clinical dashboards']} />
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 px-8 bg-white">
        <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8">
          <StepCard step="1" title="Install Hardware" desc="Set up webcam, display, and speakers — no invasive devices required." />
          <StepCard step="2" title="Detect Emotions" desc="AI models analyze facial expressions in real time to detect stress, fear, or calm." />
          <StepCard step="3" title="Trigger Calming Responses" desc="Soothing visuals, sounds, and ambient lighting activate automatically." />
          <StepCard step="4" title="Alert & Log" desc="Instant alerts to staff with secure emotion history tracking." />
          <StepCard step="5" title="Integrate & Optimize" desc="Connect to EMRs and hospital dashboards for proactive decisions." />
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="bg-gray-50 py-16 px-8 text-center">
        <h3 className="text-3xl font-bold mb-6">Impact</h3>
        <p className="text-gray-600 max-w-3xl mx-auto mb-10">
          Restored patient expression, boosted emotional stability, faster clinical responses, improved staff efficiency, proactive ICU decision-making, and stronger family engagement.
        </p>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-700 text-white py-12 text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to Transform ICU Care?</h3>
        <p className="mb-6">Join hospitals already using AuraCare to enhance patient well-being and staff efficiency.</p>
        <button
          onClick={handleStartLogin}
          className="bg-white text-blue-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
        >
          Get Started
        </button>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-10 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold text-lg mb-2">AuraCare</h4>
            <p className="text-sm text-gray-300">AI-powered emotional monitoring for patient-centered care.</p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Contact</h4>
            <p>Email: himanimahajan2709@gmail.com</p>
            <p>Phone: +91-6239215554</p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Follow Us</h4>
            <div className="flex gap-4 mt-2">
              <a href="https://www.linkedin.com/in/samiksha-bansal" className="text-gray-300 hover:text-white"><FaLinkedin size={20} /></a>
              <a href="mailto:himanimahajan2709@gmail.com" className="text-gray-300 hover:text-white"><FaEnvelope size={20} /></a>
              <a href="https://github.com/samiksha-bansal1/AuraCare" className="text-gray-300 hover:text-white"><FaGithub size={20} /></a>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          &copy; {new Date().getFullYear()} AuraCare. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, points }: { icon: React.ReactNode; title: string; desc: string; points: string[] }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{desc}</p>
      <ul className="text-sm text-gray-700 space-y-1">
        {points.map((point, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className="text-blue-600">✔</span> {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-700 text-white text-lg font-bold mb-4">
        {step}
      </div>
      <h4 className="font-semibold text-lg mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
