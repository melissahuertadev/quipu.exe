import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const levels = [
  { title: 'La calma', rule: 'Ordena las cuerdas de menor a mayor número de nudos', key: 'knots', unit: 'nudos', message: 'No todo lo que sentimos necesita una respuesta inmediata. A veces, escucharnos es el primer paso para encontrar calma.', colors: ['terracotta', 'gold', 'teal', 'indigo'], items: [{ id: 'a', value: 5, label: 'A' }, { id: 'b', value: 1, label: 'B' }, { id: 'c', value: 4, label: 'C' }, { id: 'd', value: 2, label: 'D' }] },
  { title: 'Las diferencias', rule: 'Ordena las cuerdas de menor a mayor longitud', key: 'length', unit: 'cm', message: 'Las diferencias no tienen que separarnos. Pueden enseñarnos nuevas formas de mirar el mismo mundo.', colors: ['teal', 'indigo', 'gold', 'terracotta', 'rose'], items: [{ id: 'a', value: 68, label: 'A' }, { id: 'b', value: 32, label: 'B' }, { id: 'c', value: 54, label: 'C' }, { id: 'd', value: 21, label: 'D' }, { id: 'e', value: 44, label: 'E' }] },
  { title: 'La escucha', rule: 'Ordena las cuerdas de menor a mayor cantidad de nudos', key: 'knots', unit: 'nudos', message: 'Escuchar no es esperar tu turno para hablar. Es dejar que la experiencia del otro encuentre un lugar en ti.', colors: ['indigo', 'rose', 'terracotta', 'teal', 'gold', 'indigo'], items: [{ id: 'a', value: 8, label: 'A' }, { id: 'b', value: 3, label: 'B' }, { id: 'c', value: 11, label: 'C' }, { id: 'd', value: 1, label: 'D' }, { id: 'e', value: 6, label: 'E' }, { id: 'f', value: 4, label: 'F' }] },
  { title: 'Soltar el pasado', rule: 'Ordena las cuerdas de menor a mayor longitud', key: 'length', unit: 'cm', message: 'Soltar no borra lo vivido. Abre las manos para que el presente pueda llegar.', colors: ['gold', 'terracotta', 'teal', 'rose'], items: [{ id: 'a', value: 74, label: 'A' }, { id: 'b', value: 25, label: 'B' }, { id: 'c', value: 51, label: 'C' }, { id: 'd', value: 38, label: 'D' }] },
  { title: 'La convivencia', rule: 'Ordena las cuerdas de menor a mayor número de nudos', key: 'knots', unit: 'nudos', message: 'Convivir es aprender a cuidar el espacio que compartimos. La paz se teje entre muchas manos.', colors: ['teal', 'gold', 'indigo', 'terracotta', 'rose'], items: [{ id: 'a', value: 9, label: 'A' }, { id: 'b', value: 2, label: 'B' }, { id: 'c', value: 7, label: 'C' }, { id: 'd', value: 4, label: 'D' }, { id: 'e', value: 1, label: 'E' }] },
];

function App() {
  const [screen, setScreen] = useState('intro');
  const [levelIndex, setLevelIndex] = useState(0);
  const [moves, setMoves] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const [solved, setSolved] = useState(false);
  const [orders, setOrders] = useState(() => levels.map(level => [...level.items].reverse()));
  const level = levels[levelIndex];
  const order = orders[levelIndex];
  const complete = useMemo(() => order.every((item, index) => index === 0 || order[index - 1].value <= item.value), [order]);

  const begin = () => { setScreen('game'); setLevelIndex(0); setSolved(false); setMoves(0); };
  const move = (from, to) => {
    if (from === to || solved) return;
    const next = [...order]; const [picked] = next.splice(from, 1); next.splice(to, 0, picked);
    setOrders(all => all.map((items, index) => index === levelIndex ? next : items));
    setMoves(value => value + 1); setDragIndex(null);
    if (next.every((item, index) => index === 0 || next[index - 1].value <= item.value)) setSolved(true);
  };
  const nextLevel = () => { if (levelIndex === levels.length - 1) setScreen('end'); else { setLevelIndex(value => value + 1); setMoves(0); setSolved(false); } };

  if (screen === 'intro') return <Intro onStart={begin} />;
  if (screen === 'end') return <End onRestart={begin} />;
  return <main className="game-shell"><header className="game-header"><button className="wordmark" onClick={() => setScreen('intro')}>QUIPU<span>.EXE</span></button><div className="progress-label">MEMORIA {levelIndex + 1} <i>/</i> {levels.length}</div><div className="dots">{levels.map((_, i) => <span key={i} className={i < levelIndex || (i === levelIndex && solved) ? 'done' : i === levelIndex ? 'current' : ''} />)}</div></header>
    <section className="level-intro"><p className="eyebrow">MEMORIA {String(levelIndex + 1).padStart(2, '0')}</p><h1>{level.title}</h1><p className="rule">{level.rule}.</p></section>
    <section className="board"><div className="main-cord" /><div className="cords">{order.map((item, index) => <button key={item.id} className={`cord-wrap ${level.colors[index]} ${dragIndex === index ? 'selected' : ''}`} draggable={!solved} onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => move(dragIndex, index)} onDragEnd={() => setDragIndex(null)} onTouchStart={() => setDragIndex(index)} onClick={() => dragIndex !== null && dragIndex !== index ? move(dragIndex, index) : setDragIndex(index)} aria-label={`Cuerda ${item.label}, ${item.value} ${level.unit}`}><span className="cord" style={{ '--length': `${Math.max(92, item.value * 5 + 66)}px` }}><b className="knot one" /><b className="knot two" /><b className="knot three" /></span><small>{item.value} <em>{level.unit}</em></small></button>)}</div><p className="drag-hint">{solved ? 'MEMORIA RESTAURADA' : 'arrastra las cuerdas para reordenarlas'}</p></section>
    <footer className="game-footer"><span>Movimientos <b>{moves}</b></span>{solved ? <button className="continue" onClick={nextLevel}>{levelIndex === levels.length - 1 ? 'Ver cierre' : 'Continuar'} <strong>→</strong></button> : <span className="quiet">sin límite de intentos</span>}</footer>
    {solved && <div className="memory-card"><p className="eyebrow">MEMORIA RECUPERADA</p><p>“{level.message}”</p></div>}
  </main>;
}

function Intro({ onStart }) { return <main className="landing"><div className="landing-top"><span className="mark">Q</span><span>EXPERIENCIA 01</span></div><div className="hero-copy"><p className="eyebrow">UN JUEGO SOBRE LAS COSAS QUE NOS UNEN</p><h1>Restaura<br /><i>las memorias.</i></h1><p className="lead">Un quipu ha perdido el orden de sus historias. Devuelve cada cuerda a su lugar y descubre lo que guarda.</p><button className="start" onClick={onStart}>Restaurar memorias <strong>→</strong></button></div><div className="landing-bottom"><span>PUZZLE NARRATIVO · 5 MEMORIAS</span><span>UNA EXPERIENCIA DE CALMA</span></div><div className="orbit" /></main>; }
function End({ onRestart }) { return <main className="landing ending"><p className="eyebrow">HAS LLEGADO AL FINAL</p><h1>Todo está<br /><i>conectado.</i></h1><p className="lead">Has restaurado las cinco memorias. Quizá la paz no sea una respuesta, sino la forma en que elegimos volver a unir las cosas.</p><button className="start" onClick={onRestart}>Volver a comenzar <strong>↺</strong></button></main>; }

createRoot(document.getElementById('root')).render(<App />);
