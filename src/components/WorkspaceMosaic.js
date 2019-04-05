import React from 'react';
import PropTypes from 'prop-types';
import {
  Mosaic, MosaicWindow, getLeaves, createBalancedTreeFromLeaves,
} from 'react-mosaic-component';
import { createRemoveUpdate, updateTree } from 'react-mosaic-component/lib/util/mosaicUpdates';
import 'react-mosaic-component/react-mosaic-component.css';
import difference from 'lodash/difference';
import MosaicRenderPreview from '../containers/MosaicRenderPreview';
import Window from '../containers/Window';

/**
 * Represents a work area that contains any number of windows
 * @memberof Workspace
 * @private
 */
export class WorkspaceMosaic extends React.Component {
  /**
   */
  constructor(props) {
    super(props);

    this.tileRenderer = this.tileRenderer.bind(this);
    this.mosaicChange = this.mosaicChange.bind(this);
    this.determineWorkspaceLayout = this.determineWorkspaceLayout.bind(this);
    this.zeroStateView = <div />;
    this.windowPaths = {};
  }

  /** */
  componentDidMount() {
    const { updateWorkspaceMosaicLayout } = this.props;

    const newLayout = this.determineWorkspaceLayout();
    if (newLayout) updateWorkspaceMosaicLayout(newLayout);
  }

  /** */
  componentDidUpdate(prevProps) {
    const { windows, workspace, updateWorkspaceMosaicLayout } = this.props;
    const prevWindows = Object.keys(prevProps.windows);
    const currentWindows = Object.keys(windows);
    // Handles when Windows are removed from the state
    if (!prevWindows.every(e => currentWindows.includes(e))) {
      // There are no more remaining Windows, just return an empty layout
      if (currentWindows.length === 0) {
        updateWorkspaceMosaicLayout({});
        return;
      }

      // Generate a set of "removeUpdates" to update layout binary tree
      const removedWindows = difference(prevWindows, currentWindows);
      const removeUpdates = removedWindows
        .map(windowId => (
          createRemoveUpdate(workspace.layout, this.windowPaths[windowId])
        ));
      const newTree = updateTree(workspace.layout, removeUpdates);
      updateWorkspaceMosaicLayout(newTree);
    }
    // Handles when Windows are added (not via Add Resource UI)
    // TODO: If a window is added, add it in a better way #2380
    if (!currentWindows.every(e => prevWindows.includes(e))) {
      const newLayout = this.determineWorkspaceLayout();
      if (newLayout !== workspace.layout) updateWorkspaceMosaicLayout(newLayout);
    }
  }

  /**
   * bookkeepPath - used to book keep Window's path's
   * @param  {String} windowId   [description]
   * @param  {Array} path [description]
   */
  bookkeepPath(windowId, path) {
    this.windowPaths[windowId] = path;
  }

  /**
   * Used to determine whether or not a "new" layout should be autogenerated.
   * TODO: If a window is added, add it in a better way #2380
   */
  determineWorkspaceLayout() {
    const { windows, workspace } = this.props;
    const windowKeys = Object.keys(windows).sort();
    const leaveKeys = getLeaves(workspace.layout);
    // Windows were added
    if (!windowKeys.every(e => leaveKeys.includes(e))) {
      // No current layout, so just generate a new one
      if (leaveKeys.length === 0) {
        return createBalancedTreeFromLeaves(windowKeys);
      }
      // TODO: Here is where we will determine where to add a new Window #2380
      return createBalancedTreeFromLeaves(windowKeys);
    }

    return workspace.layout;
  }

  /**
   * Render a tile (Window) in the Mosaic.
   */
  tileRenderer(id, path) {
    const { windows, workspace } = this.props;
    const window = windows[id];
    if (!window) return null;
    this.bookkeepPath(window.id, path);
    return (
      <MosaicWindow
        toolbarControls={[]}
        additionalControls={[]}
        path={path}
        windowId={window.id}
        renderPreview={() => (
          <div className="mosaic-preview">
            <MosaicRenderPreview windowId={window.id} />
          </div>
        )}
      >
        <Window
          key={`${window.id}-${workspace.id}`}
          window={window}
        />
      </MosaicWindow>
    );
  }

  /**
   * Update the redux store when the Mosaic is changed.
   */
  mosaicChange(newLayout) {
    const { updateWorkspaceMosaicLayout } = this.props;
    updateWorkspaceMosaicLayout(newLayout);
  }

  /**
   */
  render() {
    const { workspace } = this.props;
    return (
      <Mosaic
        renderTile={this.tileRenderer}
        initialValue={workspace.layout || this.determineWorkspaceLayout()}
        onChange={this.mosaicChange}
        className="mirador-mosaic"
        zeroStateView={this.zeroStateView}
      />
    );
  }
}

WorkspaceMosaic.propTypes = {
  updateWorkspaceMosaicLayout: PropTypes.func.isRequired,
  windows: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  workspace: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};
