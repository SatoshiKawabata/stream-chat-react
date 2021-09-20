import React from 'react';
import { useChannelActionContext, useChannelStateContext } from 'stream-chat-react';

import { CloseX, Ellipse } from '../../assets';

export const SocialThreadHeader: React.FC = () => {
  const { thread } = useChannelStateContext();
  const { closeThread } = useChannelActionContext();

  if (!thread) return null;

  return (
    <div className='thread-header-container'>
      <div className='thread-header-close' onClick={closeThread}>
        <CloseX />
      </div>
      <div className='thread-header-title'>
        <div>Thread Reply</div>
        <div className='thread-header-title-sub-title'>
          with {thread.user?.name || thread.user?.id || ''}
        </div>
      </div>
      <div className='thread-header-actions'>
        <Ellipse />
      </div>
    </div>
  );
};
