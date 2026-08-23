import { useState } from 'react';
import { doc, getDoc,  updateDoc } from 'firebase/firestore';
import { fdb } from '../features/auth/firebase';
import { useAuth } from '../features/auth/authContext';
const ToggleSwitch = () => {
 const [isOn, setIsOn] = useState(false);
const [loading, setLoading] = useState(false);
const { currentUser } = useAuth();

async function handleToggle() {
  setIsOn(!isOn);
}
  const trackStyle = {
    width: '45px',
    height: '22px',
    backgroundColor: isOn ? '#22c55e' : '#d1d5db', // Green when on, gray when off
    borderRadius: '26px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.3s ease',
    padding: 0,
    outline: 'none'
  };

  const knobStyle = {
    position: 'absolute',
    top: '3px',
    left: isOn ? '26px' : '3px',
    width: '15px',
    height: '15px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transition: 'left 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    pointerEvents: 'none' // Prevents the knob from capturing clicks
  };

  return (
    <button
      disabled={loading}
      style={trackStyle}
      onClick={handleToggle}
      aria-checked={isOn}
      role="switch"
    >
      <span style={knobStyle} />
    </button>
  );
};

export default ToggleSwitch;