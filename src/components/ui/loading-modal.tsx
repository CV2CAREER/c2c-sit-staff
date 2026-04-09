import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import Spinner from "./spinner";
import VisuallyHidden from "./visually-hidden";

export default function LoadingModal () {
    return (
        <Dialog>
            <DialogContent className="min-w-[90vw] md:min-w-[60vw] lg:min-w-[50vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <VisuallyHidden><DialogTitle></DialogTitle></VisuallyHidden>
                </DialogHeader>
                <Spinner size="h-72" />
            </DialogContent>
        </Dialog>
    )
}