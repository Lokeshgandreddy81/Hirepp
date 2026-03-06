import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoBriefcase, IoPerson, IoSparkles } from 'react-icons/io5';

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(null);

  const roleCards = [
    {
      key: 'candidate',
      title: "I'm a Job Seeker",
      description: 'Find jobs and get matched by AI.',
      icon: IoPerson,
    },
    {
      key: 'recruiter',
      title: 'Hybrid Mode',
      description: 'Post jobs and find top talent fast.',
      icon: IoBriefcase,
    },
  ];

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    localStorage.setItem('selectedRole', role);
    setTimeout(() => {
      navigate('/login');
    }, 220);
  };

  return (
    <div style={styles.page}>
      <div style={styles.phoneFrame}>
        <div style={styles.screen}>
          <div style={styles.brandBlock}>
            <div style={styles.logoBadge}>
              <IoSparkles size={34} />
            </div>
            <h1 style={styles.title}>
              Hire<span style={styles.titleAccent}>Circle</span>
            </h1>
            <p style={styles.subtitle}>Smart AI matching for everyone.</p>
          </div>

          <div style={styles.cardContainer}>
            {roleCards.map((role) => {
              const RoleIcon = role.icon;
              const isActive = activeRole === role.key;
              return (
                <motion.button
                  key={role.key}
                  whileTap={{ scale: 0.985 }}
                  whileHover={{ y: -1 }}
                  animate={isActive ? { scale: 1.005 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  style={{ ...styles.card, ...(isActive ? styles.cardActive : null) }}
                  onClick={() => handleRoleSelect(role.key)}
                >
                  <div style={{ ...styles.iconBox, ...(isActive ? styles.iconBoxActive : null) }}>
                    <RoleIcon size={33} />
                  </div>

                  <div style={styles.cardText}>
                    <h3 style={{ ...styles.cardTitle, ...(isActive ? styles.cardTitleActive : null) }}>{role.title}</h3>
                    <p style={styles.cardDesc}>{role.description}</p>
                  </div>

                  <div style={styles.decorationCircle}></div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(180deg, #F0F3F9 0%, #E9EEF7 100%)',
    padding: '20px 16px',
    fontFamily: "'Inter', sans-serif",
  },
  phoneFrame: {
    width: 'min(92vw, 470px)',
    borderRadius: '48px',
    border: '14px solid #1F2D4A',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 26px 80px rgba(31, 46, 77, 0.2)',
    overflow: 'hidden',
  },
  screen: {
    minHeight: '735px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px 28px 40px',
    background: 'radial-gradient(circle at 85% 15%, rgba(167, 139, 250, 0.12), transparent 45%), #FFFFFF',
  },
  brandBlock: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '40px',
    textAlign: 'center',
  },
  logoBadge: {
    width: '88px',
    height: '88px',
    borderRadius: '24px',
    backgroundColor: '#ECE1FF',
    color: '#7C3AED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '62px',
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: '10px',
    marginTop: '0',
    letterSpacing: '-2.1px',
    lineHeight: 1,
  },
  titleAccent: {
    color: '#7C3AED',
  },
  subtitle: {
    color: '#61728F',
    fontSize: '15px',
    fontWeight: 600,
    marginTop: '0',
    marginBottom: 0,
  },
  cardContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    padding: '24px 22px',
    borderRadius: '24px',
    border: '1.6px solid #E2E8F0',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s ease',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
  },
  cardActive: {
    border: '3px solid #9C5AF7',
    backgroundColor: '#F7F1FF',
    boxShadow: '0 10px 24px rgba(124, 58, 237, 0.16)',
  },
  iconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#F3E7FF',
    color: '#A03CE8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '18px',
    zIndex: 2,
  },
  iconBoxActive: {
    backgroundColor: '#EFE3FF',
    color: '#7C3AED',
  },
  cardText: {
    zIndex: 2,
    flex: 1,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1E293B',
    margin: '0 0 4px 0',
    letterSpacing: '-0.4px',
    lineHeight: 1.2,
  },
  cardTitleActive: {
    color: '#7C3AED',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#607089',
    margin: 0,
    lineHeight: 1.45,
  },
  decorationCircle: {
    position: 'absolute',
    right: '-18px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '112px',
    height: '112px',
    borderRadius: '50%',
    background: 'rgba(211, 187, 242, 0.28)',
    zIndex: 1,
  },
};

export default LandingPage;
