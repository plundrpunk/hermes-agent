"""A symlink spelling of the same workspace must not refresh its prompt snapshot."""

import subprocess
from types import SimpleNamespace

import pytest

from agent.runtime_cwd import reset_session_cwd, set_session_cwd
from agent.system_prompt import _coding_parts


@pytest.mark.platforms("posix")
@pytest.mark.parametrize("restored", [False, True])
def test_workspace_snapshot_survives_symlink_binding(tmp_path, monkeypatch, restored):
    repo = tmp_path.resolve() / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
    (repo / "main.py").write_text("value = 1\n")
    subprocess.run(["git", "-C", str(repo), "add", "main.py"], check=True)
    subprocess.run(
        ["git", "-C", str(repo), "-c", "user.name=Test", "-c", "user.email=test@example.com",
         "commit", "-qm", "initial"], check=True,
    )
    alias = tmp_path / "alias"
    alias.symlink_to(repo, target_is_directory=True)
    monkeypatch.chdir(repo)

    def agent(**kwargs):
        return SimpleNamespace(valid_tool_names={"terminal"}, platform="cli", model="gpt-4o", **kwargs)

    token = set_session_cwd(str(alias))
    try:
        current = agent()
        workspace = _coding_parts(current)[1]
        assert workspace and "Status: clean" in workspace[0]
        (repo / "untracked.txt").write_text("new work\n")
        if restored:
            prompt = (
                f"Host: local\nUser home directory: {tmp_path}\nCurrent working directory: {alias}"
                f"\n\n{workspace[0]}"
            )
            current = agent(_cached_system_prompt=prompt)
        set_session_cwd(str(repo))
        assert _coding_parts(current)[1] == workspace
    finally:
        reset_session_cwd(token)
