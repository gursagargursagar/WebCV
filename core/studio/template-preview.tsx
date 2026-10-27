import './site.css';
import { pageHasHeading, summaries } from './design';
import { StudioPageView } from './render';
import { starterSite } from './starters';
import type { TemplateId } from './types';

/**
 * A template's starter home page, rendered for real and shrunk to a card.
 *
 * Server-rendered and `inert`: it is a picture of the template a visitor can
 * read and a crawler can see, built from the same blocks the editor uses, so
 * it can never drift from what someone actually gets.
 */
export function TemplatePreview({ template, name }: { template: TemplateId; name: string }) {
  const site = starterSite(template, name);
  const home = site.pages[0];
  return (
    <div className="wc-tpl-frame" aria-hidden="true" data-nosnippet>
      <div inert>
        <StudioPageView
          data={home.data}
          meta={{
            design: site.design,
            pages: summaries(site),
            pageId: home.id,
            hasHeading: pageHasHeading(home),
            hrefFor: () => '#',
            contactEndpoint: null,
            decorative: true,
          }}
        />
      </div>
    </div>
  );
}
