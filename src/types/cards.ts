/**
 * CardDef — Canonical card definition shared by parseDSL and GridView.
 *
 * parseDSL produces these (flat props, no nesting).
 * GridView consumes them — accepting both flat and nested (props: {}) shapes.
 *
 * This is the single source of truth. Do not define CardDef elsewhere.
 */

export interface CardDef {
    type: string;
    span?: 'full';
    borderless?: boolean;
    props?: Record<string, any>;  // nested props (certified slides use this)
    [key: string]: any;           // flat props (DSL output uses this)
}
