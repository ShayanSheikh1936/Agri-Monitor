import { auth, fdb, Googleprovider } from "../features/auth/firebase";
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// 1. Handle Google Sign-In
export const executeGoogleSignIn = async () => {
  try {
    const googleUser = await signInWithPopup(auth, Googleprovider);
    const user = googleUser.user;
    // Firestore Document Reference
    const userRef = doc(fdb, "users", user.uid);

    // Check if the user document already exists
    const docsnap = await getDoc(userRef);
    if (!docsnap.exists()) {
      // If the document doesn't exist, create it
      await setDoc(userRef, {
        fullname: user.displayName,
        EmailAddress: user.email,
        displayphoto: user.photoURL,
        firstName: user.displayName.split(" ")[0],
        lastName: user.displayName.split(" ")[1],
        uid: user.uid,
      });
    }
    return { user, error: null };
  } catch (error) {
    // console.error("Error in google sign in:", error);
    return { user: null, error: error.code || error.message };
  }
};

// 2. Handle Form Sign-Up (Email/Password)
export const executeFormSignUp = async (data) => {
  const { firstname, lastname, EmailAddress, passwords } = data;
  try {
    const userCredentials = await createUserWithEmailAndPassword(
      auth,
      EmailAddress,
      passwords
    );
    const user = userCredentials.user;

    // Firestore Document Reference
    const userRef = doc(fdb, "users", user.uid);
    const docsnapsignup = await getDoc(userRef);
    // Check if the user document already exists
    if (!docsnapsignup.exists()) {
      // If the document doesn't exist, create it
      await setDoc(userRef, {
        fullname: `${firstname} ${lastname}`,
        EmailAddress: user.email,
        displayphoto: user.photoURL,
        firstName: firstname,
        lastName: lastname,
        uid: user.uid,
      });
    }
    // const docsnap = await getDoc(userRef);
    return { user, error: null };

    // Option to get created document data

    // const docsnapdata = docsnap.data();
  } catch (error) {
    // console.error("Error in sign up:", error.code);
    let customErrorMessage = "Something went wrong";
    if (error.code === "auth/email-already-in-use") {
      customErrorMessage = "Email already in use";
    } else if (error.code === "auth/invalid-email") {
      customErrorMessage = "Invalid Email";
    } else if (error.code === "auth/weak-password") {
      customErrorMessage = "Weak Password";
    }

    return { user: null, error: customErrorMessage };
  }
};




export const executeFormLogin = async (data) => {
  const { EmailAddress, passwords } = data;
  try {
    const userCredentials = await signInWithEmailAndPassword(auth, EmailAddress, passwords)
    const user = await userCredentials.user


    // setuserData(await doc(fdb, "users", user.uid))
    const userdata = await doc(fdb, "users", user.uid)
    // console.log(userdata)

    const docsnap = await getDoc(userdata)
    // console.log(docsnap.data());

    return { user: user, error: null, docData: docsnap.data() };

  } catch (error) {
    // console.error("Error in google sign in:", error);
    return { user: null, error: error.code || error.message };
  }
}

