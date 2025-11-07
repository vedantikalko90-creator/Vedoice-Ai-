import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-white shadow-lg sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">
          Vedoice AI
        </h1>
        <nav>
          {/* Add navigation links here if needed */}
        </nav>
      </div>
    </header>
  );
};

export default Header;