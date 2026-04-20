import { useApp } from './context/AppContext';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import CalibrationScreen from './components/CalibrationScreen/CalibrationScreen';
import PlacementScreen from './components/PlacementScreen/PlacementScreen';
import AppShell from './components/AppShell/AppShell';
import HomeScreen from './components/HomeScreen/HomeScreen';
import MasterModeScreen from './components/MasterModeScreen/MasterModeScreen';
import ScaleModeScreen from './components/ScaleModeScreen/ScaleModeScreen';
import TitlesScreen from './components/TitlesScreen/TitlesScreen';
import SettingsScreen from './components/SettingsScreen/SettingsScreen';

function TabContent({ tab }) {
  switch (tab) {
    case 'home':     return <HomeScreen />;
    case 'master':   return <MasterModeScreen />;
    case 'scale':    return <ScaleModeScreen />;
    case 'titles':   return <TitlesScreen />;
    case 'settings': return <SettingsScreen />;
    default:         return <HomeScreen />;
  }
}

export default function App() {
  const { state } = useApp();
  const { screen, activeTab } = state;

  if (screen === 'welcome')     return <WelcomeScreen />;
  if (screen === 'calibration') return <CalibrationScreen />;
  if (screen === 'placement')   return <PlacementScreen />;

  // Main app
  return (
    <AppShell>
      <TabContent tab={activeTab} />
    </AppShell>
  );
}
