{if $addons.makemelook.project_token && $but_role eq "big"}
<button type="button"
        class="ty-btn ty-btn__secondary mml-try-on-btn"
        onclick="window.makeMeLook && window.makeMeLook.open({literal}{{/literal}productId: '{$product.product_id}'{literal}}{/literal})">
    {$addons.makemelook.button_text|default:"Примерить"}
</button>
{/if}
