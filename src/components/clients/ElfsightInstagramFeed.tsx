import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram } from 'lucide-react';

interface ElfsightInstagramFeedProps {
  appId: string;
}

const ElfsightInstagramFeed = ({ appId }: ElfsightInstagramFeedProps) => {
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://elfsightcdn.com/platform.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://elfsightcdn.com/platform.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Add global CSS to try hiding Elfsight branding
    const style = document.createElement('style');
    style.textContent = `
      .eapps-widget-toolbar,
      [class*="eapps-link"],
      a[href*="elfsight.com"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          Feed do Instagram
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div 
          className={`elfsight-app-${appId}`} 
          data-elfsight-app-lazy
        />
      </CardContent>
    </Card>
  );
};

export default ElfsightInstagramFeed;
