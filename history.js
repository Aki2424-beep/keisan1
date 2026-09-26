// Finished stroke objects are immutable; share them between history entries.
export function notebookSnapshot(page,selection,title){
 return {page:{...page,background:{...page.background},strokes:page.strokes.slice(),calculations:structuredClone(page.calculations)},selection:selection?{...selection}:null,title};
}
