import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface HowToUseProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HowToUse({ children, open, onOpenChange }: HowToUseProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("help.howToTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>{t("help.howTo1")}</li>
            <li>{t("help.howTo2")}</li>
            <li>{t("help.howTo3")}</li>
            <li>{t("help.howTo4")}</li>
            <li>{t("help.howTo5")}</li>
            <li>{t("help.howTo6")}</li>
            <li>{t("help.howTo7")}</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
