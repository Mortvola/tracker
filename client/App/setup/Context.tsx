import React, { createContext, useContext } from 'react';

class Store {
  url: string | null = null;

  password: string | null = null;
}

const store = new Store();
const StoreContext = createContext(store);

const useStore = (): Store => (
  useContext(StoreContext)
);

type PropsType = {
  children: React.ReactNode,
}

const SetupContext: React.FC<PropsType> = ({ children }) => (
  <StoreContext.Provider value={store}>
    {children}
  </StoreContext.Provider>
);

export { useStore, SetupContext };
