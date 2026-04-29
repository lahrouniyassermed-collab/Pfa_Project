import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import AboutSection from '../components/landing/AboutSection'
import MenuSection from '../components/landing/MenuSection'
import ReservationSection from '../components/landing/ReservationSection'
import ReviewsSection from '../components/landing/ReviewsSection'
import JobsSection from '../components/landing/JobsSection'
import Footer from '../components/landing/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f' }}>
      <Navbar />
      <HeroSection />
      <AboutSection />
      <MenuSection />
      <ReservationSection />
      <ReviewsSection />
      <JobsSection />
      <Footer />
    </div>
  )
}
