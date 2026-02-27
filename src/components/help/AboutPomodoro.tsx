import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface AboutPomodoroProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AboutPomodoro({ children, open, onOpenChange }: AboutPomodoroProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("help.aboutTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{t("help.aboutP1")}</p>
          <p>{t("help.aboutP2")}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t("help.aboutStep1")}</li>
            <li>{t("help.aboutStep2")}</li>
            <li>{t("help.aboutStep3")}</li>
            <li>{t("help.aboutStep4")}</li>
            <li>{t("help.aboutStep5")}</li>
          </ol>
          <p>{t("help.aboutP3")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
