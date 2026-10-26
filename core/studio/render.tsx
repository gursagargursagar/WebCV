import { createElement, type ReactNode } from 'react';
import type { Config, Data } from '@puckeditor/core';
import { studioConfig } from './blocks';
import type { StudioMeta } from './types';

/**
 * Renders a Studio page without the editor.
 *
 * Puck's own `Render` would do, but it brings the editor's bundle along to
 * every visitor; the blocks are plain functions of their props, so walking
 * the page's content list is all a published page needs.
 */

const config = studioConfig();

export function StudioPageView({ data, meta }: { data: Data; meta: StudioMeta }) {
  const puck = {
    isEditing: false,
    metadata: meta as unknown as Record<string, unknown>,
    renderDropZone: () => null,
    dragRef: null,
  };
  const components = config.components as Config['components'];

  const blocks: ReactNode[] = (data.content ?? []).map((item, index) => {
    const block = components[item.type];
    if (!block) return null;
    const props = { ...(block.defaultProps ?? {}), ...item.props, puck };
    return createElement(block.render, { key: String(item.props?.id ?? index), ...props });
  });

  const root = config.root?.render;
  if (!root) return <>{blocks}</>;
  return createElement(root, {
    ...((data.root as { props?: Record<string, unknown> })?.props ?? {}),
    children: blocks,
    puck,
  } as never);
}
