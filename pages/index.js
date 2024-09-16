// pages/index.js

import Head from 'next/head';
import TowerDefenseGame from '../components/TowerDefenseGame';

export default function Home() {
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
}
