import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Players from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Rankings from './pages/Rankings';
import ComparePlayers from './pages/ComparePlayers';
import TeamBuilder from './pages/TeamBuilder';


export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/players"        element={<Players />} />
        <Route path="/players/:id"    element={<PlayerProfile />} />
        <Route path="/rankings"       element={<Rankings />} />
        <Route path="/compare"        element={<ComparePlayers />} />
        <Route path="/team-builder"   element={<TeamBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}