// Temporary ESM loader hook: redirects firebase imports to local stubs.
export async function resolve(specifier, context, nextResolve) {
  const stubBase = new URL("./__stubs/", import.meta.url);
  if (specifier === "firebase/firestore") {
    return { url: new URL("firestoreStub.mjs", stubBase).href, shortCircuit: true };
  }
  if (specifier.endsWith("features/auth/firebase.js")) {
    return { url: new URL("firebaseAppStub.mjs", stubBase).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
