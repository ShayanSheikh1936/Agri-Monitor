import { ReactHookForm } from "../components/inputbox";
import FormPage from "./formpage";

export default function Signup(){
    return(
        <>
        <FormPage page="Sign Up" >
            <ReactHookForm/>
            </FormPage>
        </>
    )
}