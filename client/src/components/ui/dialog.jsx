import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const DialogContext = React.createContext({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open, onOpenChange, children, ...props }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ asChild, children, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext);
  
  const handleClick = (e) => {
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

function DialogPortal({ children }) {
  const { open } = React.useContext(DialogContext);
  if (!open) return null;
  
  // Use a simple portal-like render for now (fixed position covers the screen)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {children}
    </div>
  );
}

function DialogOverlay({ className, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

function DialogContent({ className, children, showCloseButton = true, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext);
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        className={cn(
          "relative bg-white z-50 grid w-full max-w-lg gap-4 rounded-lg border p-6 shadow-lg animate-in zoom-in-95 duration-200",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <XIcon size={18} />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-gray-500 text-sm", className)}
      {...props}
    />
  );
}

function DialogClose({ children, ...props }) {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <div onClick={() => onOpenChange(false)} {...props}>
            {children}
        </div>
    )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
