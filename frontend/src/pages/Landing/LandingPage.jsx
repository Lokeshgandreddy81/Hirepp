import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoBriefcase, IoPerson } from 'react-icons/io5';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    // We save the selected role to localStorage so the Login/Signup pages know who this is
    localStorage.setItem('selectedRole', role);
    navigate('/login'); // Redirect to Login after selection
  };

  return (
    <div style={styles.container}>
      {/* Logo Icon Placeholder */}
      <div style={styles.logoContainer}>
        <div style={styles.logoIcon}>✨</div>
      </div>

      <h1 style={styles.title}>Hire App</h1>
      <p style={styles.subtitle}>Smart AI matching for everyone.</p>

      <div style={styles.cardContainer}>
        {/* Job Seeker Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          style={styles.card} 
          onClick={() => handleRoleSelect('candidate')}
        >
          <div style={{...styles.iconBox, background: '#E0E7FF', color: '#4F46E5'}}>
            <IoPerson size={24} />
          </div>
          <div style={styles.cardText}>
            <h3 style={styles.cardTitle}>I'm a Job Seeker</h3>
            <p style={styles.cardDesc}>Find jobs and get matched by AI.</p>
          </div>
          <div style={styles.decorationCircle}></div>
        </motion.div>

        {/* Employer Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          style={styles.card} 
          onClick={() => handleRoleSelect('recruiter')}
        >
          <div style={{...styles.iconBox, background: '#FAE8FF', color: '#D946EF'}}>
            <IoBriefcase size={24} />
          </div>
          <div style={styles.cardText}>
            <h3 style={styles.cardTitle}>I'm an Employer</h3>
            <p style={styles.cardDesc}>Post jobs and find top talent fast.</p>
          </div>
          <div style={styles.decorationCircle}></div>
        </motion.div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  logoContainer: {
    marginBottom: '15px',
  },
  logoIcon: {
    width: '60px',
    height: '60px',
    backgroundColor: '#F3E8FF', // Light purple bg
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    color: '#9333EA',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#111827',
    marginBottom: '8px',
    marginTop: '0',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: '16px',
    marginBottom: '40px',
    marginTop: '0',
  },
  cardContainer: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '24px',
    border: '1px solid #F3F4F6',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
  },
  iconBox: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    zIndex: 2,
  },
  cardText: {
    zIndex: 2,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 4px 0',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
  },
  decorationCircle: {
    position: 'absolute',
    right: '-20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
    zIndex: 1,
  }
};

export default LandingPage;