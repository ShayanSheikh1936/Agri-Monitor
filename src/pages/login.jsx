import Backnavigate from "../components/BackNavigate";
import { ReactHookFormlogin } from "../components/inputbox";
import Signup from "./formpage";

export default function Login(){
    return(
        <>
        <Signup page={"Log in"} >
            {<ReactHookFormlogin/>}
            </Signup>

        </>
    )
}