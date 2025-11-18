import vm from "node:vm";

export default (context, scriptStr) => {
  const script = new vm.Script(scriptStr);
  vm.createContext(context);
  script.runInContext(context);
};
