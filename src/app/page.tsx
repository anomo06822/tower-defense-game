// app/page.tsx

import Head from 'next/head';
import TowerDefenseGame from '../components/TowerDefenseGame';

const HomePage: React.FC = () => {
  return (
    <div>
      <Head>
        <title>Tower Defense Game</title>
        <meta name="description" content="A web-based Tower Defense Game" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <TowerDefenseGame />
      </main>
    </div>
  );
};

export default HomePage;
