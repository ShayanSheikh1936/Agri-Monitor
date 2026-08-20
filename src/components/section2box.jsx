import { Droplet } from "lucide-react";
import { Fragment } from "react";
export function DetailsBox({ icons, headings, lists }) {

    return (
        <>
            <div className="relative flex flex-col items-center p-2 pt-4 w-100 bg-amber-100 gap-3 rounded-2xl">
                <div className="absolute top-[-60px] w-20 h-20 rounded-full bg-[#679936] grid place-items-center z-100">{icons}</div>
                <div className="text-center text-black text-3xl bebas-neue-regular pt-3">{headings}</div>
                <div>
                    <ul className="flex flex-col gap-2 list-disc pl-5 ">
                        {lists.map((value, index) => {
                            return(
                            <Fragment key={index}>
                                <li  className="text-black"><h3 className="font-semibold inline-block">{value.listHeading} </h3>{value.listText}</li>
                            </Fragment>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </>
    )
}