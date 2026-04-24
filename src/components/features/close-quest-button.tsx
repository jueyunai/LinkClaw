'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { updateEventStatus } from '@/app/[locale]/events/actions';

export function CloseQuestButton({ eventId }: { eventId: string }) {
  const tEvents = useTranslations('events');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {tEvents('unpublish')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tEvents('confirmCloseTitle')}</DialogTitle>
          <DialogDescription>{tEvents('confirmCloseDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {tEvents('cancelClose')}
          </DialogClose>
          <form action={updateEventStatus}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value="closed" />
            <input type="hidden" name="returnTo" value="my-events" />
            <Button type="submit" variant="destructive">
              {tEvents('confirmClose')}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
