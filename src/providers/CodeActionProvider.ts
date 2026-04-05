// ============================================================
// CS Quill 🦔 — CodeAction Provider (Step 35~43)
// ============================================================
// 빨간 줄 난 곳에 전구 💡 표시 + 원클릭 수리.

import * as vscode from 'vscode';

// Step 35~36: CodeActionProvider 인터페이스 구현
export class QuillCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  // Step 38: provideCodeActions — 마우스 위치의 Diagnostic 필터링
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // CS Quill이 생성한 Diagnostic만 처리
      if (!diagnostic.source?.startsWith('CS Quill')) continue;

      // Step 39: fix 데이터 확인
      const fix = (diagnostic as any)._quillFix as { range: { startLine: number; endLine: number }; newText: string } | undefined;

      if (fix && fix.newText) {
        // Step 40: CodeAction 생성
        const action = new vscode.CodeAction(
          `✨ CS Quill: 자동 수정 — ${diagnostic.message.slice(0, 50)}`,
          vscode.CodeActionKind.QuickFix,
        );

        // Step 41~42: WorkspaceEdit 생성 + replace
        const edit = new vscode.WorkspaceEdit();
        const fixRange = new vscode.Range(
          Math.max(0, fix.range.startLine - 1), 0,
          Math.max(0, fix.range.endLine), 0,
        );
        edit.replace(document.uri, fixRange, fix.newText + '\n');
        action.edit = edit;

        action.diagnostics = [diagnostic];
        action.isPreferred = true; // 기본 선택 (Ctrl+.)

        actions.push(action);
      }

      // 항상: "이 에러 무시" 옵션 추가
      const suppressAction = new vscode.CodeAction(
        `🔇 무시: ${diagnostic.message.slice(0, 40)}`,
        vscode.CodeActionKind.QuickFix,
      );
      const suppressEdit = new vscode.WorkspaceEdit();
      const lineIdx = diagnostic.range.start.line;
      const lineText = document.lineAt(lineIdx).text;
      const indent = lineText.match(/^\s*/)?.[0] ?? '';
      suppressEdit.insert(document.uri, new vscode.Position(lineIdx, 0), `${indent}// cs-quill-ignore: ${diagnostic.code ?? diagnostic.message.slice(0, 30)}\n`);
      suppressAction.edit = suppressEdit;
      suppressAction.diagnostics = [diagnostic];

      actions.push(suppressAction);
    }

    return actions;
  }
}
