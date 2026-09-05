import { Droplet } from "lucide-react";
import { Fragment } from "react";
export function DetailsBox({ icons, headings, lists }) {

    return (
        <>
            {/* Below lg this is a swipe carousel (one card ~85vw so the next peeks);
                at lg+ flex-1 + max-w-100 reproduces the original 400px 3-across row. */}
            <div className="relative flex flex-col items-center p-2 pt-4 w-[85vw] max-w-100 sm:w-[45vw] shrink-0 snap-start lg:shrink lg:w-auto lg:flex-1 bg-amber-100 gap-3 rounded-2xl">
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